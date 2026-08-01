const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    { success: false, error: { code, message } },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}

function csrfFailure(request: Request) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin && origin !== url.origin) {
    return jsonError(
      403,
      "CROSS_SITE_REQUEST_BLOCKED",
      "Cross-site state changes are not allowed.",
    );
  }
  if (fetchSite === "cross-site") {
    return jsonError(
      403,
      "CROSS_SITE_REQUEST_BLOCKED",
      "Cross-site state changes are not allowed.",
    );
  }
  return null;
}

function routeGroup(pathname: string) {
  if (pathname.startsWith("/r/")) return "/r/:shortPath";
  return pathname
    .replace(/^\/api\/products\/[^/]+/, "/api/products/:id")
    .replace(/^\/api\/admin\/[^/]+\/[^/]+/, "/api/admin/:resource/:id")
    .slice(0, 160);
}

async function inspectAuthenticationFingerprint(
  request: Request,
  db: D1Database,
  fingerprintHash: string,
) {
  const email = request.headers.get("oai-authenticated-user-email");
  if (!email) return;
  const region = request.headers.get("cf-ipcountry")?.slice(0, 8) ?? null;
  const previous = await db
    .prepare(
      `SELECT fingerprint_hash, region, occurred_at FROM security_events
       WHERE event_type = 'AUTH_FINGERPRINT_OBSERVED' AND actor_email = ?
       ORDER BY occurred_at DESC LIMIT 1`,
    )
    .bind(email)
    .first<{
      fingerprint_hash: string | null;
      region: string | null;
      occurred_at: string;
    }>();
  const now = new Date().toISOString();
  if (
    previous &&
    previous.fingerprint_hash !== fingerprintHash &&
    previous.region &&
    region &&
    previous.region !== region
  ) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO security_events (
            id, severity, event_type, actor_email, fingerprint_hash, region,
            metadata_json, occurred_at
          ) VALUES (?, 'WARNING', 'SUSPICIOUS_LOGIN', ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          email,
          fingerprintHash,
          region,
          JSON.stringify({ previousRegion: previous.region }),
          now,
        ),
      db
        .prepare(
          `UPDATE application_users
           SET suspicious_login_count = suspicious_login_count + 1,
             updated_at = ? WHERE email = ?`,
        )
        .bind(now, email),
    ]);
  }
  if (
    !previous ||
    new Date(previous.occurred_at).getTime() < Date.now() - 24 * 60 * 60_000
  ) {
    await db
      .prepare(
        `INSERT INTO security_events (
          id, severity, event_type, actor_email, fingerprint_hash, region,
          metadata_json, occurred_at, resolved_at
        ) VALUES (?, 'INFO', 'AUTH_FINGERPRINT_OBSERVED', ?, ?, ?, '{}', ?, ?)`,
      )
      .bind(crypto.randomUUID(), email, fingerprintHash, region, now, now)
      .run();
  }
}

export async function guardRequest(request: Request, db?: D1Database) {
  const csrf = csrfFailure(request);
  if (csrf) return csrf;
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/r/")) {
    return null;
  }
  // Local rendering and authentication-boundary tests intentionally omit D1.
  // Production deployments require the DB binding and therefore execute the
  // durable limiter and security-event controls below.
  if (!db) return null;
  const method = request.method.toUpperCase();
  const limit = url.pathname.startsWith("/r/")
    ? 300
    : MUTATING_METHODS.has(method)
      ? 60
      : 120;
  const identity =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  const fingerprintHash = await sha256Hex(
    `${identity}|${request.headers.get("user-agent") ?? "unknown"}`,
  );
  await inspectAuthenticationFingerprint(request, db, fingerprintHash);
  const bucketKey = await sha256Hex(
    `${fingerprintHash}|${method}|${routeGroup(url.pathname)}`,
  );
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60_000);
  await db
    .prepare(
      `INSERT INTO rate_limit_buckets (
        bucket_key, request_count, window_started_at, expires_at
      ) VALUES (?, 1, ?, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        request_count = CASE WHEN expires_at <= excluded.window_started_at
          THEN 1 ELSE request_count + 1 END,
        window_started_at = CASE WHEN expires_at <= excluded.window_started_at
          THEN excluded.window_started_at ELSE window_started_at END,
        expires_at = CASE WHEN expires_at <= excluded.window_started_at
          THEN excluded.expires_at ELSE expires_at END`,
    )
    .bind(bucketKey, now.toISOString(), expiresAt.toISOString())
    .run();
  const bucket = await db
    .prepare(
      `SELECT request_count, expires_at FROM rate_limit_buckets
       WHERE bucket_key = ?`,
    )
    .bind(bucketKey)
    .first<{ request_count: number; expires_at: string }>();
  if ((bucket?.request_count ?? 0) <= limit) return null;
  await db
    .prepare(
      `INSERT INTO security_events (
        id, severity, event_type, fingerprint_hash, region, metadata_json,
        occurred_at
      ) VALUES (?, 'WARNING', 'RATE_LIMIT_EXCEEDED', ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      fingerprintHash,
      request.headers.get("cf-ipcountry")?.slice(0, 8) ?? null,
      JSON.stringify({
        method,
        route: routeGroup(url.pathname),
        requestCount: bucket?.request_count ?? 0,
        limit,
      }),
      now.toISOString(),
    )
    .run();
  const response = jsonError(
    429,
    "RATE_LIMITED",
    "Too many requests. Please retry shortly.",
  );
  response.headers.set(
    "retry-after",
    String(
      Math.max(
        1,
        Math.ceil(
          (new Date(bucket?.expires_at ?? expiresAt).getTime() - Date.now()) /
            1000,
        ),
      ),
    ),
  );
  return response;
}
