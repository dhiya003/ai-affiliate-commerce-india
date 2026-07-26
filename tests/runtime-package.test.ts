import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("container builds the production worker and applies migrations on startup", async () => {
  const [dockerfile, startScript, wranglerConfig, compose] = await Promise.all([
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../docker/start.sh", import.meta.url), "utf8"),
    readFile(new URL("../docker/wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../compose.yaml", import.meta.url), "utf8"),
  ]);

  assert.match(dockerfile, /RUN npm run build/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(startScript, /d1 migrations apply affinity-india-local/);
  assert.match(startScript, /exec npx wrangler dev/);
  assert.match(wranglerConfig, /"main": "\.\.\/dist\/server\/index\.js"/);
  assert.match(wranglerConfig, /"binding": "DB"/);
  assert.match(compose, /postgres:16-bookworm/);
});

test("core verifier exercises and cleans up the complete workflow", async () => {
  const verifier = await readFile(
    new URL("../scripts/verify-core-workflow.mjs", import.meta.url),
    "utf8",
  );

  assert.match(verifier, /ALLOW_VERIFY_MUTATIONS/);
  assert.match(verifier, /\/api\/products\/\$\{productId\}\/score/);
  assert.match(verifier, /\/api\/products\/\$\{productId\}\/content/);
  assert.match(verifier, /\["REVIEWED", "APPROVED", "PROMOTED"\]/);
  assert.match(verifier, /finally/);
  assert.match(verifier, /method: "DELETE"/);
});
