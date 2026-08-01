/** Cloudflare Worker entry point for the vinext-starter template. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { runDueAutomationJobs } from "../lib/automation/repository";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
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
  if (new URL(request.url).pathname.startsWith("/api/")) {
    headers.set("cache-control", "no-store");
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

    const response = await handler.fetch(request, env, ctx);
    return finalizeResponse(response, request, startedAt);
  },
  async scheduled(
    controller: { scheduledTime: number },
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runDueAutomationJobs(env.DB, new Date(controller.scheduledTime)).then(
        ({ retries, scheduled }) => {
          console.info(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: "info",
              event: "automation.scheduler.completed",
              retryCount: retries.length,
              scheduledCount: scheduled.length,
            }),
          );
        },
      ),
    );
  },
};

export default worker;
