import assert from "node:assert/strict";
import test from "node:test";
import {
  AjioAdapter,
  AmazonAdapter,
  FlipkartAdapter,
  MeeshoAdapter,
  MyntraAdapter,
  type AjioProduct,
  type AmazonProduct,
  type FlipkartProduct,
  type MeeshoProduct,
  type MyntraProduct,
} from "../lib/ingestion/adapters/index.ts";
import type {
  MarketplaceAdapter,
  MarketplaceFeedClient,
  MarketplaceName,
  NormalizedProduct,
} from "../lib/ingestion/types.ts";

class FixtureClient<T> implements MarketplaceFeedClient<T> {
  private readonly products: readonly T[];
  lastSignal: AbortSignal | undefined;

  constructor(products: readonly T[]) {
    this.products = products;
  }

  async fetchProducts(signal?: AbortSignal): Promise<readonly T[]> {
    this.lastSignal = signal;
    return this.products;
  }
}

const observedAt = "2026-07-29T00:00:00.000Z";

const amazon: AmazonProduct = {
  asin: "B0ABC12345",
  title: "Acme Wireless Earbuds",
  brand: "Acme",
  description: "Compact wireless earbuds.",
  detailPageUrl: "https://www.amazon.in/dp/B0ABC12345",
  affiliateUrl: "https://www.amazon.in/dp/B0ABC12345?tag=creator-21",
  imageUrl: "https://images.example.com/amazon.jpg",
  category: "Audio",
  price: 1499,
  originalPrice: 2499,
  rating: 4.3,
  reviewCount: 1200,
  sellerName: "Acme Retail",
  sellerRating: 4.5,
  available: true,
  lowStock: false,
  commissionRate: 4,
  observedAt,
};

const flipkart: FlipkartProduct = {
  fsn: "ACMEFSN123",
  title: "Acme Mixer Grinder",
  brand: "Acme",
  description: "Kitchen mixer grinder.",
  productUrl: "https://www.flipkart.com/acme-mixer/p/itm123",
  affiliateUrl: "https://www.flipkart.com/acme-mixer/p/itm123?affid=creator",
  imageUrl: "https://images.example.com/flipkart.jpg",
  category: "Kitchen",
  sellingPrice: 1999,
  maximumRetailPrice: 2999,
  rating: 4.2,
  reviewCount: 830,
  sellerName: "Kitchen Retail",
  sellerRating: 4.4,
  inStock: false,
  commissionRate: 6,
  observedAt,
};

const meesho: MeeshoProduct = {
  productId: "MSH-12345",
  title: "Printed Cotton Kurta Combo",
  brand: null,
  description: "Two-piece cotton kurta combo.",
  productUrl: "https://www.meesho.com/printed-kurta/p/abc12",
  affiliateUrl: "https://www.meesho.com/printed-kurta/p/abc12",
  imageUrl: "https://images.example.com/meesho.jpg",
  category: "Women Kurtas",
  price: 798,
  originalPrice: 1198,
  rating: 4.1,
  reviewCount: 450,
  supplierName: "Jaipur Styles",
  supplierRating: 4.2,
  available: true,
  deliveryDays: 5,
  returnWindowDays: 7,
  commissionRate: 8,
  comboQuantity: 2,
  variations: [
    { variationId: "M", size: "M", colour: "Pink", available: true },
    { variationId: "L", size: "L", colour: "Pink", available: false },
  ],
  observedAt,
};

const myntra: MyntraProduct = {
  styleId: "MYN-12345",
  title: "Roadster Blue Cotton Shirt",
  brand: "Roadster",
  description: "Casual cotton shirt.",
  productUrl: "https://www.myntra.com/shirts/roadster/style/12345",
  affiliateUrl: "https://www.myntra.com/shirts/roadster/style/12345",
  imageUrl: "https://images.example.com/myntra.jpg",
  category: "Men Shirts",
  price: 1200,
  maximumRetailPrice: 2000,
  discountPercent: 40,
  rating: 4.4,
  reviewCount: 900,
  available: true,
  commissionRate: 7,
  variations: [
    { sku: "S-BLUE", size: "S", colour: "Blue", available: true },
    { sku: "M-BLUE", size: "M", colour: "Blue", available: true },
  ],
  observedAt,
};

const ajio: AjioProduct = {
  ...myntra,
  styleId: "AJIO-12345",
  title: "DNMX Black Casual Shirt",
  brand: "DNMX",
  productUrl: "https://www.ajio.com/dnmx-shirt/p/12345",
  affiliateUrl: "https://www.ajio.com/dnmx-shirt/p/12345",
  imageUrl: "https://images.example.com/ajio.jpg",
  variations: [{ sku: "M-BLACK", size: "M", colour: "Black", available: true }],
};

const marketplaceHosts: Record<MarketplaceName, readonly string[]> = {
  Amazon: ["amazon.in"],
  Flipkart: ["flipkart.com"],
  Meesho: ["meesho.com"],
  Myntra: ["myntra.com"],
  AJIO: ["ajio.com"],
};

async function assertProviderContract<T>(
  marketplace: MarketplaceName,
  fixture: T,
  createAdapter: (client: MarketplaceFeedClient<T>) => MarketplaceAdapter<T>,
) {
  const client = new FixtureClient([fixture]);
  const adapter = createAdapter(client);
  const controller = new AbortController();
  const fetched = await adapter.fetch(controller.signal);
  assert.equal(client.lastSignal, controller.signal);
  assert.equal(adapter.marketplace, marketplace);
  assert.equal(adapter.sourceType, "API");
  assert.equal(fetched.length, 1);
  const normalized: NormalizedProduct = adapter.normalize(fetched[0]!);
  assert.equal(normalized.marketplace, marketplace);
  assert.ok(normalized.marketplaceProductId.length > 0);
  assert.ok(normalized.name.length > 0);
  assert.ok(normalized.currentPrice > 0);
  assert.ok(normalized.reviewCount >= 0);
  assert.ok(normalized.confidence >= 0 && normalized.confidence <= 100);
  assert.ok(Number.isFinite(Date.parse(normalized.sourceTimestamp)));
  for (const value of [normalized.productUrl, normalized.affiliateUrl]) {
    if (!value) continue;
    const url = new URL(value);
    assert.equal(url.protocol, "https:");
    assert.ok(
      marketplaceHosts[marketplace].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      ),
    );
  }
  assert.equal(typeof normalized.sourceAttributes, "object");
}

test("all marketplace providers satisfy the shared fetch and normalization contract", async () => {
  await assertProviderContract(
    "Amazon",
    amazon,
    (client) => new AmazonAdapter(client),
  );
  await assertProviderContract(
    "Flipkart",
    flipkart,
    (client) => new FlipkartAdapter(client),
  );
  await assertProviderContract(
    "Meesho",
    meesho,
    (client) => new MeeshoAdapter(client),
  );
  await assertProviderContract(
    "Myntra",
    myntra,
    (client) => new MyntraAdapter(client),
  );
  await assertProviderContract(
    "AJIO",
    ajio,
    (client) => new AjioAdapter(client),
  );
});

test("Amazon adapter validates identifiers, URLs, commerce, and availability", async () => {
  const adapter = new AmazonAdapter(new FixtureClient([amazon]));
  const [fetched] = await adapter.fetch();
  const normalized = adapter.normalize(fetched!);
  assert.equal(normalized.marketplaceProductId, amazon.asin);
  assert.equal(normalized.stockStatus, "IN_STOCK");
  assert.equal(normalized.affiliateUrl, amazon.affiliateUrl);
  assert.equal(normalized.sourceAttributes.asin, amazon.asin);
});

test("Flipkart adapter maps seller, prices, ratings, links, and stock", async () => {
  const adapter = new FlipkartAdapter(new FixtureClient([flipkart]));
  const normalized = adapter.normalize((await adapter.fetch())[0]!);
  assert.equal(normalized.sellerName, "Kitchen Retail");
  assert.equal(normalized.currentPrice, 1999);
  assert.equal(normalized.availabilityStatus, "UNAVAILABLE");
  assert.equal(normalized.stockStatus, "OUT_OF_STOCK");
});

test("Meesho adapter preserves supplier, delivery, return, variation, and combo evidence", async () => {
  const adapter = new MeeshoAdapter(new FixtureClient([meesho]));
  const normalized = adapter.normalize((await adapter.fetch())[0]!);
  assert.equal(normalized.sellerName, "Jaipur Styles");
  assert.equal(normalized.returnRisk, "MEDIUM");
  assert.equal(normalized.sourceAttributes.deliveryDays, 5);
  assert.equal(normalized.sourceAttributes.comboQuantity, 2);
  assert.equal(normalized.sourceAttributes.unitPrice, 399);
  assert.equal((normalized.sourceAttributes.variations as unknown[]).length, 2);
});

test("Myntra and AJIO adapters retain sizes, colours, discounts, and affiliate URLs", async () => {
  const myntraNormalized = new MyntraAdapter(
    new FixtureClient([myntra]),
  ).normalize(myntra);
  const ajioNormalized = new AjioAdapter(new FixtureClient([ajio])).normalize(
    ajio,
  );
  assert.deepEqual(myntraNormalized.sourceAttributes.sizes, ["S", "M"]);
  assert.deepEqual(myntraNormalized.sourceAttributes.colours, ["Blue"]);
  assert.equal(myntraNormalized.sourceAttributes.discountPercent, 40);
  assert.deepEqual(ajioNormalized.sourceAttributes.sizes, ["M"]);
  assert.deepEqual(ajioNormalized.sourceAttributes.colours, ["Black"]);
});

test("adapters reject cross-marketplace links and inconsistent prices", async () => {
  const badAmazon = {
    ...amazon,
    detailPageUrl: "https://www.flipkart.com/not-amazon",
  };
  const amazonAdapter = new AmazonAdapter(new FixtureClient([badAmazon]));
  await assert.rejects(
    () => amazonAdapter.fetch(),
    /approved marketplace domain/,
  );

  const badMyntra = { ...myntra, discountPercent: 75 };
  const myntraAdapter = new MyntraAdapter(new FixtureClient([badMyntra]));
  await assert.rejects(() => myntraAdapter.fetch(), /discount must match/);
});

test("adapters reject availability that conflicts with variations", async () => {
  const badMeesho = {
    ...meesho,
    available: false,
    variations: [
      { variationId: "M", size: "M", colour: "Pink", available: true },
    ],
  };
  const adapter = new MeeshoAdapter(new FixtureClient([badMeesho]));
  await assert.rejects(
    () => adapter.fetch(),
    /availability must agree with its variation/,
  );
});

test("affiliate links must use HTTPS on the matching marketplace domain", () => {
  const cases = [
    () =>
      new AmazonAdapter(new FixtureClient([])).normalize({
        ...amazon,
        affiliateUrl: "https://www.flipkart.com/wrong-marketplace",
      }),
    () =>
      new FlipkartAdapter(new FixtureClient([])).normalize({
        ...flipkart,
        affiliateUrl: "http://www.flipkart.com/insecure-link",
      }),
    () =>
      new MeeshoAdapter(new FixtureClient([])).normalize({
        ...meesho,
        affiliateUrl: "https://meesho.example.com/lookalike",
      }),
    () =>
      new MyntraAdapter(new FixtureClient([])).normalize({
        ...myntra,
        affiliateUrl: "https://www.ajio.com/wrong-fashion-platform",
      }),
    () =>
      new AjioAdapter(new FixtureClient([])).normalize({
        ...ajio,
        affiliateUrl: "https://www.myntra.com/wrong-fashion-platform",
      }),
  ];

  for (const validate of cases) {
    assert.throws(validate, /approved marketplace domain|must use HTTPS/);
  }
});
