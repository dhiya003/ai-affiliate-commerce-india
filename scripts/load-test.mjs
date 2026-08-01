import assert from "node:assert/strict";

const baseUrl = process.env.LOAD_TEST_URL;
if (!baseUrl) {
  throw new Error(
    "Set LOAD_TEST_URL to an authorized local or test deployment.",
  );
}

const concurrency = Math.min(
  100,
  Math.max(1, Number(process.env.LOAD_TEST_CONCURRENCY ?? 10)),
);
const requests = Math.min(
  5000,
  Math.max(concurrency, Number(process.env.LOAD_TEST_REQUESTS ?? 100)),
);
const token = process.env.LOAD_TEST_BEARER;
const headers = token
  ? { "OAI-Sites-Authorization": `Bearer ${token}` }
  : undefined;
const durations = [];
let failures = 0;
let cursor = 0;

async function worker() {
  while (cursor < requests) {
    cursor += 1;
    const started = performance.now();
    try {
      const response = await fetch(new URL("/api/health", baseUrl), {
        headers,
        redirect: "manual",
      });
      if (response.status >= 500) failures += 1;
    } catch {
      failures += 1;
    }
    durations.push(performance.now() - started);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
durations.sort((left, right) => left - right);
const percentile = (ratio) =>
  durations[
    Math.min(durations.length - 1, Math.floor(durations.length * ratio))
  ];
const result = {
  requests,
  concurrency,
  failures,
  failureRate: failures / requests,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
};
console.log(JSON.stringify(result, null, 2));
assert.ok(result.failureRate <= 0.01, "Failure rate exceeded 1%.");
