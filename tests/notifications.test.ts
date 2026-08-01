import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { deliverNotificationEmail } from "../lib/notifications/delivery.ts";
import {
  NOTIFICATION_TYPES,
  notificationPreferenceSchema,
  reportGenerationSchema,
} from "../lib/notifications/schema.ts";

test("notification preferences and report windows are strictly validated", () => {
  assert.equal(
    notificationPreferenceSchema.safeParse({
      inAppEnabled: true,
      emailEnabled: false,
      digestFrequency: "DAILY",
      enabledTypes: [...NOTIFICATION_TYPES],
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    }).success,
    true,
  );
  assert.equal(
    notificationPreferenceSchema.safeParse({
      inAppEnabled: true,
      emailEnabled: true,
      digestFrequency: "HOURLY",
      enabledTypes: [],
      quietHoursStart: "25:00",
      quietHoursEnd: null,
    }).success,
    false,
  );
  assert.equal(
    reportGenerationSchema.safeParse({
      type: "WEEKLY_PERFORMANCE",
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T23:59:59.999Z",
      format: "CSV",
    }).success,
    true,
  );
  assert.equal(
    reportGenerationSchema.safeParse({
      type: "MONTHLY_EARNINGS",
      from: "2026-07-31T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
      format: "JSON",
    }).success,
    false,
  );
});

test("email delivery is HTTPS-only, bounded, and provider-neutral", async () => {
  assert.deepEqual(
    await deliverNotificationEmail(
      { endpoint: "http://mail.invalid/send" },
      {
        recipientEmail: "owner@example.com",
        notificationId: "notification-1",
        type: "PRICE_DROP",
        severity: "INFO",
        title: "Price drop",
        body: "A price changed.",
        actionUrl: "/products/one",
      },
    ),
    { status: "invalid_configuration" },
  );
  const delivered = await deliverNotificationEmail(
    { endpoint: "https://mail.example.test/send", token: "secret" },
    {
      recipientEmail: "owner@example.com",
      notificationId: "notification-1",
      type: "PRICE_DROP",
      severity: "INFO",
      title: "Price drop",
      body: "A price changed.",
      actionUrl: "/products/one",
    },
    async (_input, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(
        (init?.headers as Record<string, string>).authorization,
        "Bearer secret",
      );
      return new Response(null, {
        status: 202,
        headers: { "x-message-id": "provider-message-1" },
      });
    },
  );
  assert.deepEqual(delivered, {
    status: "delivered",
    externalMessageId: "provider-message-1",
  });
});

test("notification migration creates delivery, report, and scheduled job controls", async () => {
  const journal = JSON.parse(
    await readFile(
      new URL("../drizzle/meta/_journal.json", import.meta.url),
      "utf8",
    ),
  ) as { entries: Array<{ tag: string }> };
  const migrations = await Promise.all(
    journal.entries.map(({ tag }) =>
      readFile(new URL(`../drizzle/${tag}.sql`, import.meta.url), "utf8"),
    ),
  );
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("PRAGMA foreign_keys = ON;");
    for (const migration of migrations) database.exec(migration);
    const tables = database
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
         AND name IN ('notification_preferences', 'notifications',
           'notification_deliveries', 'generated_reports') ORDER BY name`,
      )
      .all() as Array<{ name: string }>;
    assert.deepEqual(
      tables.map(({ name }) => name),
      [
        "generated_reports",
        "notification_deliveries",
        "notification_preferences",
        "notifications",
      ],
    );
    const jobs = database
      .prepare(
        `SELECT COUNT(*) AS count, SUM(enabled) AS enabled
         FROM automation_jobs`,
      )
      .get() as { count: number; enabled: number };
    assert.equal(jobs.count, 12);
    assert.equal(jobs.enabled, 0);
  } finally {
    database.close();
  }
});

test("notification and report APIs are authenticated and owner scoped", async () => {
  const paths = [
    "../app/api/notifications/route.ts",
    "../app/api/notifications/[id]/route.ts",
    "../app/api/notifications/preferences/route.ts",
    "../app/api/notifications/read-all/route.ts",
    "../app/api/notifications/scan/route.ts",
    "../app/api/reports/route.ts",
    "../app/api/reports/[id]/download/route.ts",
  ];
  const routes = await Promise.all(
    paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  for (const route of routes) assert.match(route, /requireApiUser/);
  const [repository, reports] = await Promise.all([
    readFile(
      new URL("../lib/notifications/repository.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/notifications/reports.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(repository, /owner_email = \?/);
  assert.match(repository, /ON CONFLICT\(owner_email, dedupe_key\) DO NOTHING/);
  assert.match(repository, /retryDueNotificationDeliveries/);
  assert.match(reports, /WHERE id = \? AND owner_email = \?/);
  assert.match(reports, /if \(\/\^\[=\+\\-@\]\//);
});

test("every requested operational and intelligence alert type is generated", async () => {
  const repository = await readFile(
    new URL("../lib/notifications/repository.ts", import.meta.url),
    "utf8",
  );
  for (const type of NOTIFICATION_TYPES) {
    assert.match(repository, new RegExp(`"${type}"`), type);
  }
});
