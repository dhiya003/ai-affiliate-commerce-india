import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  campaignActionSchema,
  campaignInputSchema,
  campaignQuerySchema,
} from "../lib/campaigns/schema.ts";

test("campaign input validates dates, budget, and INR defaults", () => {
  const campaign = campaignInputSchema.parse({
    name: "Festival audio push",
    objective: "Drive verified affiliate conversions",
    channel: "Instagram Reels",
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-10-15T00:00:00.000Z",
    budget: 25_000,
  });
  assert.equal(campaign.currency, "INR");
  assert.equal(campaign.budget, 25_000);

  assert.equal(
    campaignInputSchema.safeParse({
      ...campaign,
      startsAt: "2026-10-15T00:00:00.000Z",
      endsAt: "2026-10-01T00:00:00.000Z",
    }).success,
    false,
  );
});

test("campaign filters and lifecycle actions are bounded", () => {
  assert.deepEqual(
    campaignQuerySchema.parse({
      q: "audio",
      status: "ACTIVE",
      includeArchived: "true",
    }),
    {
      q: "audio",
      status: "ACTIVE",
      includeArchived: true,
    },
  );
  assert.deepEqual(campaignActionSchema.parse({ action: "duplicate" }), {
    action: "duplicate",
  });
  assert.equal(
    campaignActionSchema.safeParse({ action: "delete" }).success,
    false,
  );
});

test("campaign repository scopes every read and mutation to its owner", async () => {
  const repository = await readFile(
    new URL("../lib/campaigns/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /c\.owner_email = \?/);
  assert.match(
    repository,
    /WHERE id = \? AND owner_email = \? AND is_active = 1/,
  );
  assert.match(repository, /WHERE id = \? AND owner_email = \?/);
  assert.match(repository, /WHERE campaign_id = \? AND owner_email = \?/);
});

test("campaign APIs require server-side authenticated identity", async () => {
  const collectionRoute = await readFile(
    new URL("../app/api/campaigns/route.ts", import.meta.url),
    "utf8",
  );
  const itemRoute = await readFile(
    new URL("../app/api/campaigns/[id]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(collectionRoute, /requireApiUser\(\)/);
  assert.match(itemRoute, /requireApiUser\(\)/);
  assert.match(
    collectionRoute,
    /parseJsonBody\(request, campaignInputSchema\)/,
  );
  assert.match(itemRoute, /parseJsonBody\(request, campaignActionSchema\)/);
});
