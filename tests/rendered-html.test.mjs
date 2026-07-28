import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/", headers = {}, environment = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      IMAGES: {
        input() {
          throw new Error("Image binding should not be used in this test.");
        },
      },
      ...environment,
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the product-specific sign-in surface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Affinity India — AI Affiliate Commerce<\/title>/i);
  assert.match(html, /Find the product worth/);
  assert.match(html, /posting today/);
  assert.match(html, /Amazon, Flipkart, Meesho, Myntra and AJIO/);
  assert.match(html, /signin-with-chatgpt/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /object-src 'none'/,
  );
  assert.ok(response.headers.get("x-request-id"));
});

test("protects the dashboard and renders it for an authenticated user", async () => {
  const anonymous = await render("/dashboard");
  assert.ok([302, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /signin-with-chatgpt/);

  const authenticated = await render("/dashboard", {
    "oai-authenticated-user-email": "creator@example.com",
    "oai-authenticated-user-full-name": "Asha%20Creator",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  });
  assert.equal(authenticated.status, 200);

  const html = await authenticated.text();
  assert.match(html, /Today’s top opportunities/);
  assert.match(html, /SwiftCut Handy Chopper/);
  assert.match(html, /Asha Creator/);
  assert.match(html, /opportunity score v1/i);
});

test("protects the product catalogue", async () => {
  const anonymous = await render("/products");
  assert.ok([302, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /signin-with-chatgpt/);
});

test("protects the Phase 2 policy centre", async () => {
  const anonymous = await render("/policies");
  assert.ok([302, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /signin-with-chatgpt/);
});

test("protects the Phase 3 experiment workspace", async () => {
  const anonymous = await render("/experiments");
  assert.ok([302, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /signin-with-chatgpt/);
});

test("protects the administrator scoring-governance workspace", async () => {
  const anonymous = await render("/optimization");
  assert.ok([302, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /signin-with-chatgpt/);
});

test("protects product API routes without touching storage", async () => {
  for (const path of [
    "/api/products",
    "/api/products/demo/content",
    "/api/policies",
    "/api/content-variations",
    "/api/experiments",
    "/api/feedback",
    "/api/learning",
    "/api/optimization/weights",
    "/api/optimization/quality",
  ]) {
    const response = await render(path);
    assert.equal(response.status, 401);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^application\/json/,
    );

    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, "AUTHENTICATION_REQUIRED");
  }
});

test("ships versioned scoring governance and quality controls", async () => {
  const workspace = await readFile(
    new URL("../app/optimization/OptimizationClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /Create a scoring-weight draft/);
  assert.match(workspace, /Quality evidence/);
  assert.match(workspace, /Activate after gate/);
  assert.match(workspace, /Roll back/);
  assert.match(workspace, /no\s+material degradation/);
});

test("ships the confidence-gated experiment and learning workspace", async () => {
  const [workspace, experimentRoute, learningRoute] = await Promise.all([
    readFile(
      new URL("../app/experiments/ExperimentsClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/experiments/[id]/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/api/learning/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /Create content variations/);
  assert.match(workspace, /Configure an experiment/);
  assert.match(workspace, /Recommendation feedback/);
  assert.match(workspace, /Evidence-backed learning profiles/);
  assert.match(workspace, /silently change scoring weights/);
  assert.match(experimentRoute, /selectExperimentWinner/);
  assert.match(learningRoute, /requireRole\(user, \["ADMIN"\]\)/);
});

test("reports production dependency health without caching", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(response.headers.get("x-request-id"));

  const payload = await response.json();
  assert.equal(payload.status, "degraded");
  assert.equal(payload.services.database, "down");

  const source = await readFile(
    new URL("../app/api/health/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /SELECT 1 AS ok/);
  assert.match(source, /database: "up"/);
  assert.match(source, /status: 503/);
});

test("removes the disposable starter preview and starter assets", async () => {
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
  await assert.rejects(access(new URL("public/favicon.svg", templateRoot)));

  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("ships catalogue filtering, pagination, and product editing controls", async () => {
  const [catalogue, editor, detail] = await Promise.all([
    readFile(
      new URL("../app/products/ProductCatalogClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/products/ProductEditDialog.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/products/[id]/ProductDetailClient.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(catalogue, /Product catalogue/);
  assert.match(catalogue, /Minimum rating/);
  assert.match(catalogue, /loadProducts\(result\.pagination\.page \+ 1\)/);
  assert.match(editor, /method: "PATCH"/);
  assert.match(editor, /Save changes/);
  assert.match(detail, /ProductEditDialog/);
});

test("ships truthful dashboard trend, loading, and recovery states", async () => {
  const dashboard = await readFile(
    new URL("../app/dashboard/DashboardClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(dashboard, /Trend \{Math\.round\(product\.trendScore\)\}/);
  assert.match(dashboard, /Refreshing live catalogue/);
  assert.match(dashboard, /Live data could not refresh/);
  assert.match(dashboard, />\s*Retry\s*</);
  assert.match(dashboard, /dashboardMetrics\.averageCommission/);
  assert.match(dashboard, /timeZone: "Asia\/Kolkata"/);
  assert.doesNotMatch(dashboard, /Sunday, 26 July/);
  assert.doesNotMatch(dashboard, /\["Rising today", "18"/);
});

test("ships administrator onboarding and an evidence-based launch gate", async () => {
  const [onboarding, checklist] = await Promise.all([
    readFile(new URL("../docs/ADMIN_ONBOARDING.md", import.meta.url), "utf8"),
    readFile(
      new URL("../docs/PHASE1_LAUNCH_CHECKLIST.md", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(onboarding, /First product workflow/);
  assert.match(onboarding, /affiliate disclosure/i);
  assert.match(checklist, /\[x\] Database health endpoint/);
  assert.match(checklist, /\[ \] `OPENAI_API_KEY`/);
  assert.match(
    checklist,
    /Do not declare the complete Phase 1 launch finished/,
  );
});
