import { readFile } from "node:fs/promises";

const evidencePath = process.env.RELEASE_EVIDENCE_PATH;
const expectedCommit = process.env.RELEASE_COMMIT;
const approvalStatement = process.env.RELEASE_APPROVAL_STATEMENT;

if (!evidencePath) throw new Error("RELEASE_EVIDENCE_PATH is required.");
if (!expectedCommit) throw new Error("RELEASE_COMMIT is required.");
if (approvalStatement !== "I approve this release candidate") {
  throw new Error("The exact owner approval statement is required.");
}

const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const requiredTrue = [
  "qualityGatePassed",
  "codeqlPassed",
  "productionDependencyAuditPassed",
  "marketplaceValidationCompleted",
  "monitoringConfigured",
  "browserCompatibilityCompleted",
  "domainVerified",
  "partnerAccessApproved",
  "rollbackVerified",
];

const failures = [];
if (evidence.commitSha !== expectedCommit) {
  failures.push("Evidence commitSha must exactly match the release commit.");
}
for (const field of requiredTrue) {
  if (evidence[field] !== true) failures.push(`${field} must be true.`);
}
if (evidence.realAffiliateTrafficEnabled !== false) {
  failures.push(
    "realAffiliateTrafficEnabled must remain false until a separate production activation is approved.",
  );
}
if (evidence.ownerApproval?.approved !== true) {
  failures.push("ownerApproval.approved must be true.");
}
if (
  typeof evidence.ownerApproval?.approvedBy !== "string" ||
  evidence.ownerApproval.approvedBy.trim().length < 3
) {
  failures.push("ownerApproval.approvedBy is required.");
}
if (
  typeof evidence.ownerApproval?.approvedAt !== "string" ||
  !Number.isFinite(Date.parse(evidence.ownerApproval.approvedAt))
) {
  failures.push("ownerApproval.approvedAt must be an ISO timestamp.");
}
if (!Array.isArray(evidence.requestIds) || evidence.requestIds.length === 0) {
  failures.push("At least one verification request ID is required.");
}

if (failures.length > 0) {
  throw new Error(`Release readiness failed:\n- ${failures.join("\n- ")}`);
}

console.log(
  JSON.stringify({
    status: "ready-for-owner-controlled-private-beta-release",
    commitSha: evidence.commitSha,
    approvedBy: evidence.ownerApproval.approvedBy,
    approvedAt: evidence.ownerApproval.approvedAt,
    externalTrafficEnabled: false,
  }),
);
