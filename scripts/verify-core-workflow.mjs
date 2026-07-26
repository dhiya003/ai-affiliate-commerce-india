import assert from "node:assert/strict";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
const email = process.env.VERIFY_USER_EMAIL ?? "launch-verifier@example.com";
const allowMutations = process.env.ALLOW_VERIFY_MUTATIONS === "true";
const headers = {
  accept: "application/json",
  "content-type": "application/json",
  "oai-authenticated-user-email": email,
  "oai-authenticated-user-full-name": "Launch%20Verifier",
  "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
};

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const requestId = response.headers.get("x-request-id");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path} failed (${response.status}, request ${requestId}): ${JSON.stringify(payload)}`,
    );
  }
  return { payload, requestId, status: response.status };
}

const health = await request("/api/health");
assert.equal(health.payload.status, "ok");
assert.equal(health.payload.services.database, "up");

const catalogue = await request("/api/products?pageSize=5&sort=score");
assert.equal(catalogue.payload.success, true);
assert.ok(catalogue.payload.data.products.length > 0);
assert.ok(catalogue.requestId);

if (!allowMutations) {
  console.log(
    JSON.stringify({
      status: "read-only-pass",
      baseUrl,
      productCount: catalogue.payload.data.pagination.total,
      requestId: catalogue.requestId,
    }),
  );
  process.exit(0);
}

const marketplaceProductId = `VERIFY-${Date.now()}`;
let productId;

try {
  const created = await request("/api/products", {
    method: "POST",
    body: JSON.stringify({
      marketplace: "Amazon",
      marketplaceProductId,
      name: "Disposable launch verification product",
      description:
        "A temporary record created only by the automated core-workflow verifier.",
      productUrl: "https://www.amazon.in/example-verification-product",
      affiliateUrl: null,
      imageUrl: null,
      category: "Test Fixtures",
      sellerName: "Verification Seller",
      currentPrice: 499,
      originalPrice: 999,
      rating: 4.4,
      reviewCount: 1_200,
      commissionRate: 8,
      sellerRating: 4.5,
      stockStatus: "IN_STOCK",
      returnRisk: "LOW",
      status: "NEW",
      notes: "Delete after verification.",
      tags: ["verification", "temporary"],
    }),
  });
  assert.equal(created.status, 201);
  productId = created.payload.data.id;
  assert.ok(created.payload.data.opportunityScore > 0);

  const scored = await request(`/api/products/${productId}/score`, {
    method: "POST",
  });
  assert.equal(scored.payload.data.score.version, "v1.0.0");

  const generated = await request(`/api/products/${productId}/content`, {
    method: "POST",
  });
  assert.equal(generated.status, 201);
  assert.equal(generated.payload.data.content.reelHooks.length, 3);
  assert.match(
    generated.payload.data.content.affiliateDisclosure,
    /affiliate|commission/i,
  );

  for (const status of ["REVIEWED", "APPROVED", "PROMOTED"]) {
    const changed = await request(`/api/products/${productId}/status`, {
      method: "POST",
      body: JSON.stringify({
        status,
        note: `Automated launch verification: ${status.toLowerCase()}`,
      }),
    });
    assert.equal(changed.payload.data.status, status);
  }

  const detail = await request(`/api/products/${productId}`);
  assert.equal(detail.payload.data.product.status, "PROMOTED");
  assert.equal(detail.payload.data.statusHistory.length, 3);

  console.log(
    JSON.stringify({
      status: "core-workflow-pass",
      baseUrl,
      productId,
      finalStatus: detail.payload.data.product.status,
      generatedProvider: generated.payload.data.provider,
      requestId: detail.requestId,
    }),
  );
} finally {
  if (productId) {
    await request(`/api/products/${productId}`, { method: "DELETE" });
  }
}
