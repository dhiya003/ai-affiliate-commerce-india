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

test("accepts only HTTP(S) product and media URLs", () => {
  assert.equal(
    productInputSchema.safeParse({
      ...validProduct,
      imageUrl: "https://images.example.com/product.webp",
    }).success,
    true,
  );
  assert.equal(
    productInputSchema.safeParse({
      ...validProduct,
      productUrl: "javascript:alert(1)",
      imageUrl: "data:image/svg+xml;base64,PHN2Zy8+",
    }).success,
    false,
  );
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

test("validates evidence-backed recommendation views", () => {
  for (const view of [
    "top",
    "emerging",
    "low-competition",
    "high-commission",
    "viral-potential",
    "seasonal",
  ]) {
    assert.equal(
      productListQuerySchema.safeParse({ view, page: 1, pageSize: 10 }).success,
      true,
    );
  }
  assert.equal(
    productListQuerySchema.safeParse({ view: "invented" }).success,
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

test("all product surfaces render marketplace images with a fallback", async () => {
  const [media, dashboard, catalogue, detail] = await Promise.all([
    readFile(
      new URL("../components/products/ProductMedia.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/dashboard/DashboardClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/products/ProductCatalogClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/products/[id]/ProductDetailClient.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(media, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(media, /referrerPolicy="no-referrer"/);
  for (const surface of [dashboard, catalogue, detail]) {
    assert.match(surface, /<ProductMedia/);
  }
});

test("catalogue categories come from the complete owner-visible dataset", async () => {
  const [repository, page, catalogue] = await Promise.all([
    readFile(new URL("../lib/products/repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/products/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/products/ProductCatalogClient.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(repository, /SELECT DISTINCT category/);
  assert.match(repository, /owner_email IS NULL OR owner_email = \?/);
  assert.match(page, /listProductCategories\(user\.email\)/);
  assert.match(catalogue, /initialCategories: string\[\]/);
  assert.match(catalogue, /setCategories\(\(current\)/);
});

test("dashboard provides category, rating, and price filters", async () => {
  const dashboard = await readFile(
    new URL("../app/dashboard/DashboardClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dashboard, /aria-label="Dashboard category"/);
  assert.match(dashboard, /aria-label="Dashboard minimum rating"/);
  assert.match(dashboard, /aria-label="Dashboard minimum price"/);
  assert.match(dashboard, /aria-label="Dashboard maximum price"/);
  assert.match(dashboard, /product\.rating >= minRating/);
  assert.match(dashboard, /product\.price >= minPrice/);
  assert.match(dashboard, /product\.price <= maxPrice/);
});
