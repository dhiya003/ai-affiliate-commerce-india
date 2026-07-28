import type {
  SourceAlert,
  SourceFreshnessStatus,
  SourceHealth,
  SourceStatus,
} from "./types.ts";

interface SourceHealthInput {
  status: SourceStatus;
  freshnessWindowMinutes: number;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  rateLimitedUntil: string | null;
}

export interface SourceHealthAssessment {
  health: SourceHealth["health"];
  freshness: SourceHealth["freshness"];
  alerts: SourceAlert[];
}

function roundedMinutes(milliseconds: number): number {
  return Math.max(0, Math.floor(milliseconds / 60_000));
}

export function assessSourceHealth(
  source: SourceHealthInput,
  now = new Date(),
): SourceHealthAssessment {
  const nowMs = now.getTime();
  const windowMs = source.freshnessWindowMinutes * 60_000;
  const lastSuccessMs = source.lastSuccessAt
    ? new Date(source.lastSuccessAt).getTime()
    : null;
  const hasValidSuccess =
    lastSuccessMs != null && Number.isFinite(lastSuccessMs);
  const ageMs = hasValidSuccess ? Math.max(0, nowMs - lastSuccessMs) : null;
  const remainingMs = ageMs == null ? null : windowMs - ageMs;
  const freshnessStatus: SourceFreshnessStatus =
    ageMs == null
      ? "NEVER_SYNCED"
      : ageMs > windowMs
        ? "STALE"
        : ageMs >= windowMs * 0.75
          ? "AGING"
          : "FRESH";
  const staleAt =
    hasValidSuccess && lastSuccessMs != null
      ? new Date(lastSuccessMs + windowMs).toISOString()
      : null;
  const alerts: SourceAlert[] = [];
  const isDisabled = source.status === "DISABLED";

  if (!isDisabled && freshnessStatus === "NEVER_SYNCED") {
    alerts.push({
      code: "SOURCE_NEVER_SYNCED",
      severity: "WARNING",
      message: "This active source has not completed a successful run.",
    });
  }
  if (!isDisabled && freshnessStatus === "STALE") {
    alerts.push({
      code: "SOURCE_STALE",
      severity: "CRITICAL",
      message: `Source data is ${roundedMinutes((ageMs ?? 0) - windowMs)} minutes beyond its freshness window.`,
    });
  }
  if (!isDisabled && source.consecutiveFailures > 0) {
    alerts.push({
      code: "SOURCE_FAILURES",
      severity: source.consecutiveFailures >= 3 ? "CRITICAL" : "WARNING",
      message: `${source.consecutiveFailures} consecutive ingestion failure${source.consecutiveFailures === 1 ? "" : "s"} recorded.`,
    });
  }
  if (
    !isDisabled &&
    source.rateLimitedUntil &&
    new Date(source.rateLimitedUntil).getTime() > nowMs
  ) {
    alerts.push({
      code: "SOURCE_RATE_LIMITED",
      severity: "WARNING",
      message: `Source is rate limited until ${source.rateLimitedUntil}.`,
    });
  }

  const health: SourceHealth["health"] = isDisabled
    ? "DISABLED"
    : source.status === "DEGRADED" ||
        source.status === "RATE_LIMITED" ||
        source.consecutiveFailures > 0
      ? "DEGRADED"
      : freshnessStatus === "STALE" || freshnessStatus === "NEVER_SYNCED"
        ? "STALE"
        : "HEALTHY";

  return {
    health,
    freshness: {
      status: freshnessStatus,
      ageMinutes: ageMs == null ? null : roundedMinutes(ageMs),
      remainingMinutes:
        remainingMs == null ? null : Math.ceil(remainingMs / 60_000),
      staleAt,
    },
    alerts,
  };
}
