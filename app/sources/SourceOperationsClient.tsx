"use client";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Database,
  LoaderCircle,
  Play,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SourceHealth } from "@/lib/ingestion/types";

interface Statistics {
  runs: number;
  rawPayloads: number;
  canonicalGroups: number;
  unresolvedErrors: number;
}

interface SourceOperationsClientProps {
  initialSources: SourceHealth[];
  initialStatistics: Statistics;
  role: "ADMIN" | "USER";
}

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

const exampleRecord = {
  marketplaceProductId: "MARKETPLACE-SKU",
  name: "Product name",
  brand: "Brand",
  description: "Operator-verified product description",
  productUrl: "https://example.com/product",
  affiliateUrl: null,
  imageUrl: null,
  category: "Category",
  sellerName: "Seller",
  currentPrice: 999,
  originalPrice: 1299,
  rating: 4.3,
  reviewCount: 250,
  commissionRate: 5,
  sellerRating: 4.4,
  stockStatus: "IN_STOCK",
  returnRisk: "LOW",
  sourceTimestamp: "2026-07-29T00:00:00.000Z",
  availabilityStatus: "AVAILABLE",
  confidence: 0.95,
};

function formatTime(value: string | null) {
  if (!value) return "No successful run";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function freshnessLabel(source: SourceHealth) {
  if (source.health === "DISABLED") return "Disabled pending partner access";
  if (source.freshness.status === "NEVER_SYNCED") return "Awaiting first run";
  if (source.freshness.status === "STALE") {
    return `${source.freshness.ageMinutes ?? 0} min old · stale`;
  }
  return `${source.freshness.ageMinutes ?? 0} min old · ${source.freshness.status.toLowerCase()}`;
}

export function SourceOperationsClient({
  initialSources,
  initialStatistics,
  role,
}: SourceOperationsClientProps) {
  const [sources, setSources] = useState(initialSources);
  const [statistics, setStatistics] = useState(initialStatistics);
  const [sourceId, setSourceId] = useState(initialSources[0]?.id ?? "");
  const selectedSource = sources.find((source) => source.id === sourceId);
  const [recordsJson, setRecordsJson] = useState(
    JSON.stringify([exampleRecord], null, 2),
  );
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const healthCounts = useMemo(
    () => ({
      healthy: sources.filter((source) => source.health === "HEALTHY").length,
      stale: sources.filter((source) => source.health === "STALE").length,
      degraded: sources.filter((source) => source.health === "DEGRADED").length,
    }),
    [sources],
  );

  async function refresh() {
    const response = await fetch("/api/ingestion");
    const payload = (await response.json()) as Envelope<{
      sources: SourceHealth[];
      statistics: Statistics;
    }>;
    if (!response.ok || !payload.data) {
      throw new Error(
        payload.error?.message ?? "Source health refresh failed.",
      );
    }
    setSources(payload.data.sources);
    setStatistics(payload.data.statistics);
  }

  async function runImport() {
    if (!selectedSource) return;
    setRunning(true);
    setMessage(null);
    try {
      const records = JSON.parse(recordsJson) as unknown;
      const response = await fetch("/api/ingestion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceId: selectedSource.id,
          marketplace: selectedSource.marketplace,
          records,
        }),
      });
      const payload = (await response.json()) as Envelope<{
        runId: string;
        status: string;
        importedCount: number;
        updatedCount: number;
        duplicateCount: number;
        failedCount: number;
      }>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Ingestion run failed.");
      }
      setMessage(
        `Run ${payload.data.status.toLowerCase()}: ${payload.data.importedCount} imported, ${payload.data.updatedCount} updated, ${payload.data.duplicateCount} duplicates, ${payload.data.failedCount} failed.`,
      );
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ingestion run failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="border-b border-[#dce2db] bg-[#102c1e] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <Link
            href="/dashboard"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Phase 2 intelligence
            </p>
            <p className="mt-1 font-semibold">Product source operations</p>
          </div>
          <span className="ml-auto rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold tracking-wide">
            {role}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section>
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            Ingestion control plane
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Source health, lineage, and manual runs
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a61]">
            Every import retains its raw payload, source timestamp, confidence,
            canonical match, freshness state, and run-level outcome.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Runs", statistics.runs, Activity],
            ["Raw payloads", statistics.rawPayloads, Database],
            ["Canonical groups", statistics.canonicalGroups, CheckCircle2],
            ["Open errors", statistics.unresolvedErrors, CircleAlert],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof Activity;
            return (
              <article
                key={String(label)}
                className="rounded-2xl border border-[#dce2db] bg-white p-5"
              >
                <MetricIcon
                  className="size-5 text-[#3c9d59]"
                  aria-hidden="true"
                />
                <p className="mt-5 text-3xl font-semibold">{String(value)}</p>
                <p className="mt-1 text-sm text-[#68736b]">{String(label)}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[#dce2db] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Marketplace sources</h2>
              <p className="mt-1 text-xs text-[#68736b]">
                {healthCounts.healthy} healthy · {healthCounts.stale} awaiting
                first/fresh run · {healthCounts.degraded} degraded
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce2db] px-3 py-2 text-xs font-semibold"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSourceId(source.id)}
                className={`rounded-xl border p-4 text-left ${source.id === sourceId ? "border-[#3c9d59] bg-[#f0faf2]" : "border-[#e2e7e1]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{source.marketplace}</span>
                  <span className="rounded-full bg-[#edf2ed] px-2 py-1 text-[10px] font-bold">
                    {source.health}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#68736b]">{source.name}</p>
                <p className="mt-4 text-[11px] text-[#7b867e]">
                  Last success: {formatTime(source.lastSuccessAt)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#53685a]">
                  Freshness: {freshnessLabel(source)}
                </p>
                {source.alerts.length ? (
                  <div className="mt-3 space-y-1.5">
                    {source.alerts.map((alert) => (
                      <p
                        key={alert.code}
                        className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-50 text-red-800"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {alert.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <h2 className="text-lg font-semibold">Manual operator trigger</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736b]">
              Select a verified marketplace source and submit up to 250
              normalized records. Mutations are admin-only.
            </p>
            <label className="mt-5 block text-xs font-bold">Source</label>
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dce2db] bg-white px-3 py-2.5 text-sm"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.marketplace} · {source.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={role !== "ADMIN" || running || !selectedSource}
              onClick={() => void runImport()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#102c1e] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {running ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Run ingestion
            </button>
            {role !== "ADMIN" ? (
              <p className="mt-3 text-xs text-amber-700">
                Configure your email in ADMIN_EMAILS to enable operator actions.
              </p>
            ) : null}
            {message ? (
              <p aria-live="polite" className="mt-3 text-xs text-[#45624d]">
                {message}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[#dce2db] bg-[#14261b] p-5 text-white">
            <label className="text-xs font-bold tracking-wide text-[#8fe1a5] uppercase">
              Records JSON
            </label>
            <textarea
              value={recordsJson}
              onChange={(event) => setRecordsJson(event.target.value)}
              spellCheck={false}
              className="mt-3 min-h-[390px] w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-xs leading-5 text-[#dff4e4] outline-none focus:border-[#63cc80]"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
