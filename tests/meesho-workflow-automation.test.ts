import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  buildMeeshoCreativeSvg,
  MEESHO_CREATIVE_HEIGHT,
  MEESHO_CREATIVE_WIDTH,
  MEESHO_IMAGE_HEIGHT,
} from "../lib/meesho/creative.ts";
import {
  parseMeeshoAutoDmReportCsv,
  parseMeeshoWishlistCsv,
} from "../lib/meesho/csv.ts";
import { publishInstagramImage } from "../lib/meesho/instagram.ts";
import {
  meeshoWorkflowActionSchema,
  meeshoWorkflowImportSchema,
  summarizeMeeshoWorkflowList,
  type MeeshoCreatorWorkflow,
} from "../lib/meesho/workflow-schema.ts";

const baseWorkflow: MeeshoCreatorWorkflow = {
  id: "workflow-1",
  ownerEmail: "owner@example.com",
  productId: "product-1",
  source: "MEESHO_WISHLIST",
  status: "CREATIVE_READY",
  productUrl: "https://www.meesho.com/sky-blue-dress/p/abc123",
  affiliateUrl:
    "https://www.meesho.com/sky-blue-dress/p/abc123?aff_id=verified",
  title: "Sky Blue Colour Printed Dress",
  imageUrl: "https://images.meesho.com/product.avif",
  category: "Ethnic wear",
  price: 504,
  originalPrice: null,
  supplierName: "Verified supplier",
  observedAt: "2026-08-02T00:00:00.000Z",
  factsVerifiedAt: "2026-08-02T00:01:00.000Z",
  generatedContentId: "content-1",
  caption:
    "An aqua Anarkali moment. Comment LINK and I’ll send the product details to your DM. Price and availability may change on Meesho. #ad",
  hashtags: ["#MeeshoFinds", "#AnarkaliDress"],
  creativePublicToken: "public-token",
  creativeRenderedAt: "2026-08-02T00:02:00.000Z",
  approvedAt: null,
  instagramCreationId: null,
  instagramMediaId: null,
  instagramPermalink: null,
  publishedAt: null,
  autoDmEnrolledAt: null,
  autoDmTriggerWords: ["LINK", "PRICE", "DETAILS", "DM"],
  publishAttemptCount: 0,
  nextRetryAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  autoDmMetrics: {
    delivered: 0,
    opened: 0,
    clicked: 0,
    conversions: 0,
    revenue: 0,
    commission: 0,
  },
  lastAutoDmReportAt: null,
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:02:00.000Z",
};

test("wishlist imports require verified Meesho product facts", () => {
  const parsed = meeshoWorkflowImportSchema.parse({
    productUrl: baseWorkflow.productUrl,
    title: baseWorkflow.title,
    imageUrl: baseWorkflow.imageUrl,
    category: baseWorkflow.category,
    price: baseWorkflow.price,
    observedAt: baseWorkflow.observedAt,
  });
  assert.equal(parsed.originalPrice, null);
  assert.throws(() =>
    meeshoWorkflowImportSchema.parse({
      ...parsed,
      productUrl: "https://example.com/not-meesho",
    }),
  );
});

test("creative action enforces URL-free caption and hashtag separation", () => {
  const action = meeshoWorkflowActionSchema.parse({
    action: "render-creative",
    caption: baseWorkflow.caption,
    hashtags: baseWorkflow.hashtags,
  });
  assert.equal(action.action, "render-creative");
  assert.throws(() =>
    meeshoWorkflowActionSchema.parse({
      action: "render-creative",
      caption: baseWorkflow.caption,
      hashtags: ["Meesho Finds"],
    }),
  );
});

test("renderer creates an exact 1080x1920 9:16 creative with a 60/40 split", () => {
  const svg = buildMeeshoCreativeSvg(
    baseWorkflow,
    "data:image/jpeg;base64,cHJvZHVjdA==",
  );
  assert.equal(MEESHO_CREATIVE_WIDTH, 1080);
  assert.equal(MEESHO_CREATIVE_HEIGHT, 1920);
  assert.equal(MEESHO_IMAGE_HEIGHT, 1152);
  assert.equal(MEESHO_IMAGE_HEIGHT / MEESHO_CREATIVE_HEIGHT, 0.6);
  assert.match(svg, /width="1080" height="1920"/);
  assert.match(svg, /height="1152"/);
  assert.match(svg, /Comment LINK/);
  assert.match(svg, /#ad/);
});

test("Meta publisher creates and publishes a container and captures the permalink", async () => {
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/media_publish")) {
      return Response.json({ id: "media-1" });
    }
    if (url.includes("fields=permalink")) {
      return Response.json({
        permalink: "https://www.instagram.com/p/example/",
      });
    }
    return Response.json({ id: "container-1" });
  }) as typeof fetch;
  const result = await publishInstagramImage(
    {
      accessToken: "token",
      businessAccountId: "account",
      graphVersion: "v23.0",
      fetcher,
    },
    {
      imageUrl: "https://app.example.com/creative.jpg",
      caption: `${baseWorkflow.caption} ${baseWorkflow.hashtags.join(" ")}`,
    },
  );
  assert.deepEqual(result, {
    creationId: "container-1",
    mediaId: "media-1",
    permalink: "https://www.instagram.com/p/example/",
  });
  assert.equal(calls.length, 3);
});

test("workflow summary reports publishing, AutoDM, retry, and human-gate counts", () => {
  const summary = summarizeMeeshoWorkflowList([
    { ...baseWorkflow, status: "IMPORTED" },
    { ...baseWorkflow, id: "2", status: "RETRY_SCHEDULED" },
    {
      ...baseWorkflow,
      id: "3",
      status: "AUTODM_ENROLLED",
      publishedAt: "2026-08-02T01:00:00.000Z",
      autoDmEnrolledAt: "2026-08-02T01:05:00.000Z",
      autoDmMetrics: {
        delivered: 100,
        opened: 75,
        clicked: 20,
        conversions: 4,
        revenue: 2000,
        commission: 140,
      },
    },
  ]);
  assert.equal(summary.total, 3);
  assert.equal(summary.published, 1);
  assert.equal(summary.autoDmEnrolled, 1);
  assert.equal(summary.retryScheduled, 1);
  assert.equal(summary.awaitingHumanAction, 1);
  assert.equal(summary.delivered, 100);
  assert.equal(summary.conversions, 4);
  assert.equal(summary.commission, 140);
});

test("wishlist CSV imports verified facts and an optional official affiliate link", () => {
  const result = parseMeeshoWishlistCsv(
    `product_url,title,image_url,category,price,affiliate_url\n${baseWorkflow.productUrl},${baseWorkflow.title},${baseWorkflow.imageUrl},${baseWorkflow.category},504,${baseWorkflow.affiliateUrl}`,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0]?.productUrl, baseWorkflow.productUrl);
  assert.equal(result[0]?.affiliateUrl, baseWorkflow.affiliateUrl);
  assert.equal(result[0]?.price, 504);
});

test("AutoDM report CSV parses delivery and conversion metrics", () => {
  const result = parseMeeshoAutoDmReportCsv(
    "workflow_id,delivered,opened,clicked,conversions,revenue,commission\nworkflow-1,100,75,20,4,2000,140",
  );
  assert.equal(result.length, 1);
  assert.equal(result[0]?.workflowId, "workflow-1");
  assert.equal(result[0]?.delivered, 100);
  assert.equal(result[0]?.conversions, 4);
  assert.equal(result[0]?.commission, 140);
});

test("D1 migration creates durable workflow and retry indexes", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(
      "CREATE TABLE products (id text PRIMARY KEY); CREATE TABLE generated_content (id text PRIMARY KEY);",
    );
    database.exec(
      await readFile(
        new URL(
          "../drizzle/0016_meesho_creator_workflows.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    database.exec(
      await readFile(
        new URL("../drizzle/0017_meesho_safe_fallbacks.sql", import.meta.url),
        "utf8",
      ),
    );
    const table = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meesho_creator_workflows'",
      )
      .get() as { name: string };
    const indexes = database
      .prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'index' AND tbl_name = 'meesho_creator_workflows'",
      )
      .get() as { count: number };
    assert.equal(table.name, "meesho_creator_workflows");
    assert.ok(indexes.count >= 4);
    assert.equal(
      (
        database
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meesho_autodm_report_imports'",
          )
          .get() as { name: string }
      ).name,
      "meesho_autodm_report_imports",
    );
  } finally {
    database.close();
  }
});
