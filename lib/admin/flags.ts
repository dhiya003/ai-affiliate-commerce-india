const flagCache = new Map<string, { enabled: boolean; expiresAt: number }>();

export async function isFeatureEnabled(key: string) {
  const cached = flagCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;
  const { env } = await import("cloudflare:workers");
  if (!env.DB) return false;
  const flag = await env.DB.prepare(
    `SELECT enabled, rollout_percent FROM feature_flags WHERE key = ?`,
  )
    .bind(key)
    .first<{ enabled: number; rollout_percent: number }>();
  const enabled = Boolean(flag?.enabled) && (flag?.rollout_percent ?? 0) > 0;
  flagCache.set(key, { enabled, expiresAt: Date.now() + 30_000 });
  return enabled;
}
