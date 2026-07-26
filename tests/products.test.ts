import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseProductCsv } from "../lib/products/csv.ts";
import {
  productInputSchema,
  productListQuerySchema,
} from "../lib/products/schema.ts";

const validProduct = {
  marketplace: "Amazon",
  marketplaceProductId: "AMZ-123",
  name: "Useful kitchen product",
  productUrl: "https://www.amazon.in/example",
  category: "Home & Kitchen",
  currentPrice: 599,
  originalPrice: 999,
  rating: 4.5,
  reviewCount: 1200,
  commissionRate: 8,
  sellerRating: 4.6,
  stockStatus: "IN_STOCK",
  returnRisk: "LOW",
  status: "NEW",
  tags: ["Kitchen", "under-1000", "kitchen"],
} as const;

test("validates and normalizes manual product input", () => {
  const result = productInputSchema.parse(validProduct);
  assert.deepEqual(result.tags, ["kitchen", "under-1000"]);
  assert.equal(result.marketplace, "Amazon");
});

test("rejects impossible price and rating values", () => {
  const result = productInputSchema.safeParse({
    ...validProduct,
    currentPrice: 1_499,
    originalPrice: 999,
    rating: 7,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(
      result.error.issues.map((issue) => issue.message).join(" "),
      /Original price|Too big/,
    );
  }
});

test("parses quoted CSV rows and reports row-level validation errors", () => {
  const csv = [
    "marketplace,marketplaceProductId,name,productUrl,category,currentPrice,originalPrice,rating,tags",
    'Amazon,AMZ-1,"Chopper, 500 ml",https://amazon.in/p,Home & Kitchen,399,799,4.5,kitchen|under-500',
    "Unknown,ABC-2,Bad product,not-a-url,Home,500,400,9,bad",
  ].join("\n");
  const result = parseProductCsv(csv);

  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0]?.name, "Chopper, 500 ml");
  assert.deepEqual(result.valid[0]?.tags, ["kitchen", "under-500"]);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0]?.row, 3);
});

test("validates catalogue filters and pagination boundaries", () => {
  const valid = productListQuerySchema.parse({
    marketplace: "Meesho",
    minRating: "4",
    minPrice: "250",
    maxPrice: "1000",
    page: "2",
    sort: "rating",
  });
  assert.equal(valid.page, 2);
  assert.equal(valid.minRating, 4);

  assert.equal(
    productListQuerySchema.safeParse({
      minPrice: "1500",
      maxPrice: "500",
    }).success,
    false,
  );
});

test("Sites migration creates durable product tables, indexes, and seed data", async () => {
  const sql = await readFile(
    new URL("../drizzle/0000_real_pandemic.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /CREATE TABLE `products`/);
  assert.match(sql, /CREATE TABLE `product_status_history`/);
  assert.match(sql, /products_marketplace_external_id_unique/);
  assert.match(sql, /INSERT INTO `products`/);
  assert.equal(
    [
      "amazon-earbuds",
      "myntra-kurta",
      "meesho-chopper",
      "flipkart-serum",
      "ajio-handbag",
      "amazon-bands",
    ].filter((id) => sql.includes(`'${id}'`)).length,
    6,
  );
});

test("legacy seed scores are normalized before product detail rendering", async () => {
  const repository = await readFile(
    new URL("../lib/products/repository.ts", import.meta.url),
    "utf8",
  );
  const detail = await readFile(
    new URL("../app/products/[id]/ProductDetailClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(repository, /function productScore\(row: ProductRow\)/);
  assert.match(repository, /parsed\.breakdown/);
  assert.match(repository, /parsed\.explanation/);
  assert.match(repository, /calculateOpportunityScore\(\{/);
  assert.match(detail, /product\.score\?\.breakdown/);
});
