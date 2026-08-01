import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = new URL(
  "../scripts/verify-release-readiness.mjs",
  import.meta.url,
);

async function evidenceFile(overrides: Record<string, unknown> = {}) {
  const directory = await mkdtemp(join(tmpdir(), "affinity-release-"));
  const path = join(directory, "evidence.json");
  await writeFile(
    path,
    JSON.stringify({
      commitSha: "a".repeat(40),
      qualityGatePassed: true,
      codeqlPassed: true,
      productionDependencyAuditPassed: true,
      marketplaceValidationCompleted: true,
      monitoringConfigured: true,
      browserCompatibilityCompleted: true,
      domainVerified: true,
      partnerAccessApproved: true,
      rollbackVerified: true,
      realAffiliateTrafficEnabled: false,
      requestIds: ["request-verified-1"],
      ownerApproval: {
        approved: true,
        approvedBy: "Product owner",
        approvedAt: "2026-08-01T00:00:00.000Z",
      },
      ...overrides,
    }),
  );
  return path;
}

function verify(path: string, statement = "I approve this release candidate") {
  return spawnSync(process.execPath, [script.pathname], {
    encoding: "utf8",
    env: {
      ...process.env,
      RELEASE_COMMIT: "a".repeat(40),
      RELEASE_EVIDENCE_PATH: path,
      RELEASE_APPROVAL_STATEMENT: statement,
    },
  });
}

test("release readiness requires complete evidence and keeps traffic disabled", async () => {
  const valid = verify(await evidenceFile());
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /ready-for-owner-controlled-private-beta-release/);

  const incomplete = verify(
    await evidenceFile({ monitoringConfigured: false }),
  );
  assert.notEqual(incomplete.status, 0);
  assert.match(incomplete.stderr, /monitoringConfigured must be true/);

  const trafficEnabled = verify(
    await evidenceFile({ realAffiliateTrafficEnabled: true }),
  );
  assert.notEqual(trafficEnabled.status, 0);
  assert.match(trafficEnabled.stderr, /must remain false/);
});

test("release workflow requires main, protected approval, and the exact commit", async () => {
  const [workflow, dependabot] = await Promise.all([
    readFile(
      new URL("../.github/workflows/release-readiness.yml", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8"),
  ]);
  assert.match(workflow, /environment: production-release/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /ref: \$\{\{ inputs\.release_commit \}\}/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.doesNotMatch(workflow, /wrangler deploy|docker push|kubectl/);
  assert.equal(dependabot.match(/target-branch: main/g)?.length, 2);
});
