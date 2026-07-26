import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/", headers = {}) {
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

test("protects product API routes without touching storage", async () => {
  for (const path of ["/api/products", "/api/products/demo/content"]) {
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
