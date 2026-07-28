import { NextResponse } from "next/server";
import { logEvent } from "@/lib/observability/logger";
import { captureOperationalError } from "@/lib/observability/monitoring-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  const checkedAt = new Date().toISOString();

  try {
    const { env } = await import("cloudflare:workers");
    const databaseCheck = await env.DB.prepare("SELECT 1 AS ok").first<{
      ok: number;
    }>();
    if (databaseCheck?.ok !== 1) throw new Error("Database check failed");

    return NextResponse.json(
      {
        status: "ok",
        checkedAt,
        services: {
          database: "up",
          contentGeneration: env.OPENAI_API_KEY
            ? "openai-configured"
            : "built-in-ready",
          errorMonitoring: env.ERROR_MONITORING_WEBHOOK_URL
            ? "webhook-configured"
            : "worker-logs-only",
        },
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  } catch (error) {
    logEvent("error", "health.database.unavailable", {
      requestId,
      status: 503,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    captureOperationalError({
      event: "health.database.unavailable",
      requestId,
      status: 503,
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      {
        status: "degraded",
        checkedAt,
        services: {
          database: "down",
          contentGeneration: "unknown",
          errorMonitoring: "unknown",
        },
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  }
}
