import assert from "node:assert/strict";
import test from "node:test";
import { loggerInternals, logEvent } from "../lib/observability/logger.ts";
import {
  deliverOperationalError,
  monitoringInternals,
} from "../lib/observability/monitoring.ts";

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

test("monitoring accepts HTTPS destinations only", () => {
  assert.equal(
    monitoringInternals.httpsEndpoint("https://monitor.example.com/events")
      ?.hostname,
    "monitor.example.com",
  );
  assert.equal(
    monitoringInternals.httpsEndpoint("http://monitor.example.com/events"),
    null,
  );
  assert.equal(monitoringInternals.httpsEndpoint("not-a-url"), null);
});

test("monitoring delivers a bounded redacted operational event", async () => {
  let receivedUrl = "";
  let receivedRequest: RequestInit | undefined;
  const fakeFetch = (async (input, init) => {
    receivedUrl = String(input);
    receivedRequest = init;
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  const result = await deliverOperationalError(
    {
      endpoint: "https://monitor.example.com/events",
      token: "test-token",
    },
    {
      event: "api.request.failed",
      requestId: "request-123",
      code: "DATABASE_UNAVAILABLE",
      status: 503,
      errorType: "ApiError",
    },
    fakeFetch,
  );

  assert.deepEqual(result, { status: "delivered" });
  assert.equal(receivedUrl, "https://monitor.example.com/events");
  assert.equal(
    (receivedRequest?.headers as Record<string, string>).authorization,
    "Bearer test-token",
  );
  const body = JSON.parse(String(receivedRequest?.body)) as Record<
    string,
    unknown
  >;
  assert.deepEqual(
    Object.keys(body).sort(),
    [
      "code",
      "environment",
      "errorType",
      "event",
      "occurredAt",
      "requestId",
      "status",
    ].sort(),
  );
  assert.equal(body.requestId, "request-123");
});

test("monitoring delivery failures never throw into request handling", async () => {
  const fakeFetch = (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch;

  assert.deepEqual(
    await deliverOperationalError(
      { endpoint: "https://monitor.example.com/events" },
      {
        event: "api.request.unhandled",
        requestId: "request-456",
        status: 500,
      },
      fakeFetch,
    ),
    { status: "failed" },
  );
});
