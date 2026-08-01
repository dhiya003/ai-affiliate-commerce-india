/** Cloudflare Worker entry point for the vinext-starter template. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { runDueAutomationJobs } from "../lib/automation/repository";
import { validateWorkerEnvironment } from "../lib/env";
import { guardRequest } from "../lib/security/request-guard";
import {
  processDueBackgroundJobs,
  seedMaintenanceQueue,
} from "../lib/queue/repository";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ENVIRONMENT_VALIDATION_MODE?: "strict" | "test";
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ERROR_MONITORING_WEBHOOK_URL?: string;
  ERROR_MONITORING_TOKEN?: string;
  NOTIFICATION_EMAIL_WEBHOOK_URL?: string;
  NOTIFICATION_EMAIL_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
}

const validatedEnvironments = new WeakSet<object>();

function assertRuntimeEnvironment(env: Env) {
  if (validatedEnvironments.has(env)) return;
  validateWorkerEnvironment(env as unknown as Record<string, unknown>);
  validatedEnvironments.add(env);
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const securityHeaders = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
  ].join("; "),
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
} as const;

function routePattern(pathname: string): string {
  return pathname
    .replace(/^\/api\/products\/[^/]+/, (match) =>
      match.replace(/^\/api\/products\/[^/]+/, "/api/products/:id"),
    )
    .replace(/^\/products\/[^/]+/, "/products/:id");
}

function finalizeResponse(
  response: Response,
  request: Request,
  startedAt: number,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  if (new URL(request.url).protocol === "https:") {
    headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/api/")) {
    const privatelyCacheable =
      request.method === "GET" &&
      (pathname === "/api/policies" || pathname === "/api/products");
    headers.set(
      "cache-control",
      privatelyCacheable
        ? "private, max-age=15, stale-while-revalidate=30"
        : "no-store",
    );
  }

  const requestId = headers.get("x-request-id") ?? crypto.randomUUID();
  headers.set("x-request-id", requestId);
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "http.request.completed",
      requestId,
      method: request.method,
      route: routePattern(new URL(request.url).pathname),
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    }),
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function recordRequestMetric(
  db: D1Database,
  request: Request,
  status: number,
  durationMs: number,
) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/")) return;
  await db
    .prepare(
      `INSERT INTO operational_metrics (
        id, metric_name, value, unit, dimensions_json, recorded_at
      ) VALUES (?, 'api.request_duration', ?, 'milliseconds', ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      durationMs,
      JSON.stringify({
        route: routePattern(pathname),
        method: request.method,
        status,
        error: status >= 500,
      }),
      new Date().toISOString(),
    )
    .run();
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    assertRuntimeEnvironment(env);
    const startedAt = performance.now();
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );
      return finalizeResponse(response, request, startedAt);
    }

    const blocked = await guardRequest(request, env.DB);
    if (blocked) return finalizeResponse(blocked, request, startedAt);

    const response = await handler.fetch(request, env, ctx);
    ctx.waitUntil(
      recordRequestMetric(
        env.DB,
        request,
        response.status,
        Math.round(performance.now() - startedAt),
      ).catch((error) => {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            event: "operational.metric.write_failed",
            message: error instanceof Error ? error.message : "unknown",
          }),
        );
      }),
    );
    return finalizeResponse(response, request, startedAt);
  },
  async scheduled(
    controller: { scheduledTime: number },
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    assertRuntimeEnvironment(env);
    const scheduledAt = new Date(controller.scheduledTime);
    ctx.waitUntil(
      Promise.all([
        runDueAutomationJobs(env.DB, scheduledAt),
        seedMaintenanceQueue(env.DB, scheduledAt).then(() =>
          processDueBackgroundJobs(env.DB, scheduledAt),
        ),
      ]).then(([automation, queue]) => {
        console.info(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "info",
            event: "automation.scheduler.completed",
            retryCount: automation.retries.length,
            scheduledCount: automation.scheduled.length,
            queueProcessed: queue.processed,
            queueFailed: queue.failed,
          }),
        );
      }),
    );
  },
};

export default worker;
