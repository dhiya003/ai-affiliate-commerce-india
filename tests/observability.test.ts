import assert from "node:assert/strict";
import test from "node:test";
import { loggerInternals, logEvent } from "../lib/observability/logger.ts";

test("structured logger removes sensitive context", () => {
  const context = loggerInternals.safeContext({
    requestId: "request-123",
    status: 503,
    email: "creator@example.com",
    authorization: "Bearer secret",
    prompt: "private generation prompt",
    productId: "product-123",
  });

  assert.deepEqual(context, {
    requestId: "request-123",
    status: 503,
    productId: "product-123",
  });
});

test("structured logger emits machine-readable records", () => {
  const originalInfo = console.info;
  let emitted = "";
  console.info = (value) => {
    emitted = String(value);
  };
  try {
    logEvent("info", "test.completed", {
      requestId: "request-123",
      status: 200,
    });
  } finally {
    console.info = originalInfo;
  }

  const record = JSON.parse(emitted) as Record<string, unknown>;
  assert.equal(record.level, "info");
  assert.equal(record.event, "test.completed");
  assert.equal(record.requestId, "request-123");
  assert.equal(record.status, 200);
  assert.equal(typeof record.timestamp, "string");
});
