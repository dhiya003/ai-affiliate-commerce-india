"use client";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { ScoringWeights } from "@/lib/optimization/schema";
import type {
  RecommendationQualitySnapshot,
  ScoringWeightVersion,
} from "@/lib/optimization/types";

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

const factorLabels: Array<[keyof ScoringWeights["factorWeights"], string]> = [
  ["ratingScore", "Rating"],
  ["reviewGrowthScore", "Review growth"],
  ["demandScore", "Demand"],
  ["trendScore", "Trend"],
  ["commissionScore", "Commission"],
  ["sellerReliabilityScore", "Seller reliability"],
  ["saturationScore", "Competition"],
  ["viralityScore", "Virality"],
  ["priceBandScore", "Price band"],
  ["categoryConversionScore", "Category conversion"],
  ["festivalRelevanceScore", "Festival relevance"],
  ["targetAudienceSizeScore", "Audience size"],
  ["visualAppealScore", "Visual appeal"],
  ["urgencyScore", "Urgency"],
  ["stockStabilityScore", "Stock stability"],
];

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "The request failed.");
  }
  return payload.data;
}

function stateClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "DRAFT") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function OptimizationClient({
  initialVersions,
  initialSnapshots,
  defaultWeights,
  defaultRange,
}: {
  initialVersions: ScoringWeightVersion[];
  initialSnapshots: RecommendationQualitySnapshot[];
  defaultWeights: ScoringWeights;
  defaultRange: { from: string; to: string };
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function begin(key: string) {
    setBusy(key);
    setNotice(null);
    setError(null);
  }

  function fail(caught: unknown) {
    setError(caught instanceof Error ? caught.message : "The request failed.");
    setBusy(null);
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("draft");
    const form = new FormData(event.currentTarget);
    try {
      const factorWeights = Object.fromEntries(
        factorLabels.map(([factor]) => [
          factor,
          Number(form.get(`factor:${factor}`)),
        ]),
      );
      const draft = await readResponse<ScoringWeightVersion>(
        await fetch("/api/optimization/weights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            version: form.get("version"),
            weights: {
              factorWeights,
              marketplaceMultipliers: JSON.parse(
                String(form.get("marketplaceMultipliers") || "{}"),
              ),
              categoryMultipliers: JSON.parse(
                String(form.get("categoryMultipliers") || "{}"),
              ),
            },
            evidenceFrom: new Date(
              `${String(form.get("evidenceFrom"))}T00:00:00+05:30`,
            ).toISOString(),
            evidenceTo: new Date(
              `${String(form.get("evidenceTo"))}T23:59:59+05:30`,
            ).toISOString(),
            observationCount: Number(form.get("observationCount")),
            reason: form.get("reason"),
          }),
        }),
      );
      setVersions((current) => [draft, ...current]);
      setNotice(`Draft ${draft.version} was created. It is not active.`);
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function versionAction(
    version: ScoringWeightVersion,
    action: "activate" | "rollback",
  ) {
    begin(`${action}:${version.id}`);
    try {
      await readResponse<unknown>(
        await fetch(`/api/optimization/weights/${version.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      );
      const refreshed = await readResponse<ScoringWeightVersion[]>(
        await fetch("/api/optimization/weights"),
      );
      setVersions(refreshed);
      setNotice(
        action === "activate"
          ? `${version.version} is now active.`
          : `${version.version} was rolled back.`,
      );
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function calculateQuality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("quality");
    const form = new FormData(event.currentTarget);
    try {
      const snapshot = await readResponse<RecommendationQualitySnapshot>(
        await fetch("/api/optimization/quality", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            modelVersion: form.get("modelVersion"),
            from: new Date(
              `${String(form.get("from"))}T00:00:00+05:30`,
            ).toISOString(),
            to: new Date(
              `${String(form.get("to"))}T23:59:59+05:30`,
            ).toISOString(),
          }),
        }),
      );
      setSnapshots((current) => [
        snapshot,
        ...current.filter((row) => row.id !== snapshot.id),
      ]);
      setNotice(`Quality snapshot for ${snapshot.modelVersion} was saved.`);
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="border-b border-[#dce2db] bg-[#102c1e] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <Link
            href="/experiments"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to experiments"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Administrator control
            </p>
            <p className="mt-1 font-semibold">Scoring governance</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section>
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            Versioned and reversible
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Improve recommendation weights without silent model drift
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a61]">
            Every proposal is a draft. Activation requires a matching quality
            snapshot, at least 20 recommendations, sufficient confidence, and no
            material degradation versus the active baseline.
          </p>
        </section>

        {notice ? (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" /> {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={(event) => void createDraft(event)}
            className="rounded-2xl border border-[#dce2db] bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="size-5 text-[#4c815b]" />
              <div>
                <h2 className="font-semibold">Create a scoring-weight draft</h2>
                <p className="text-xs text-[#6c786f]">
                  Factor weights must total exactly 1.0000.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold">
                Version
                <input
                  name="version"
                  required
                  pattern="v\d+\.\d+\.\d+"
                  placeholder="v2.1.0"
                  className="field-control mt-1 w-full"
                />
              </label>
              <label className="text-xs font-bold">
                Evidence from
                <input
                  type="date"
                  name="evidenceFrom"
                  required
                  defaultValue={defaultRange.from}
                  className="field-control mt-1 w-full"
                />
              </label>
              <label className="text-xs font-bold">
                Evidence to
                <input
                  type="date"
                  name="evidenceTo"
                  required
                  defaultValue={defaultRange.to}
                  className="field-control mt-1 w-full"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {factorLabels.map(([factor, label]) => (
                <label key={factor} className="text-xs font-bold">
                  {label}
                  <input
                    type="number"
                    name={`factor:${factor}`}
                    min="0.01"
                    max="0.3"
                    step="0.01"
                    required
                    defaultValue={defaultWeights.factorWeights[factor]}
                    className="field-control mt-1 w-full"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Marketplace multiplier JSON
                <textarea
                  name="marketplaceMultipliers"
                  defaultValue="{}"
                  className="field-control mt-1 min-h-24 w-full font-mono text-[11px]"
                />
              </label>
              <label className="text-xs font-bold">
                Category multiplier JSON
                <textarea
                  name="categoryMultipliers"
                  defaultValue="{}"
                  className="field-control mt-1 min-h-24 w-full font-mono text-[11px]"
                />
              </label>
              <label className="text-xs font-bold">
                Evidence observations
                <input
                  type="number"
                  name="observationCount"
                  min="0"
                  required
                  className="field-control mt-1 w-full"
                />
              </label>
              <label className="text-xs font-bold">
                Reason and expected effect
                <textarea
                  name="reason"
                  required
                  minLength={20}
                  maxLength={4000}
                  className="field-control mt-1 min-h-24 w-full"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy !== null}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#102c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "draft" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Save governed draft
            </button>
          </form>

          <form
            onSubmit={(event) => void calculateQuality(event)}
            className="h-fit rounded-2xl border border-[#dce2db] bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="size-5 text-[#4c815b]" />
              <div>
                <h2 className="font-semibold">Quality evidence</h2>
                <p className="text-xs text-[#6c786f]">
                  Calculate approval, promotion and success rates.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-bold">
                Model version
                <input
                  name="modelVersion"
                  required
                  placeholder="v2.1.0"
                  className="field-control mt-1 w-full"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  From
                  <input
                    type="date"
                    name="from"
                    required
                    defaultValue={defaultRange.from}
                    className="field-control mt-1 w-full"
                  />
                </label>
                <label className="text-xs font-bold">
                  To
                  <input
                    type="date"
                    name="to"
                    required
                    defaultValue={defaultRange.to}
                    className="field-control mt-1 w-full"
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy !== null}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#cad3ca] px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${busy === "quality" ? "animate-spin" : ""}`}
              />
              Calculate snapshot
            </button>
            <div className="mt-5 space-y-2">
              {snapshots.slice(0, 8).map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="rounded-xl bg-[#f5f7f4] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{snapshot.modelVersion}</span>
                    <span>
                      {(snapshot.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="mt-2 text-[#5d6a61]">
                    {snapshot.recommendationCount} recommendations ·{" "}
                    {snapshot.approvalRate.toFixed(1)}% approved ·{" "}
                    {snapshot.promotionRate.toFixed(1)}% promoted ·{" "}
                    {snapshot.conversionRate.toFixed(1)}% successful
                  </p>
                </div>
              ))}
            </div>
          </form>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold tracking-[0.14em] text-[#4c815b] uppercase">
              Activation ledger
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Scoring versions</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {versions.length ? (
              versions.map((version) => (
                <article
                  key={version.id}
                  className="rounded-2xl border border-[#dce2db] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{version.version}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#5d6a61]">
                        {version.reason}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${stateClass(version.status)}`}
                    >
                      {version.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[#6c786f]">
                    {version.observationCount} observations · evidence{" "}
                    {version.evidenceFrom.slice(0, 10)} to{" "}
                    {version.evidenceTo.slice(0, 10)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {version.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => void versionAction(version, "activate")}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#102c1e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <ShieldCheck className="size-3.5" /> Activate after gate
                      </button>
                    ) : null}
                    {version.status === "ACTIVE" &&
                    version.previousVersionId ? (
                      <button
                        type="button"
                        onClick={() => void versionAction(version, "rollback")}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#cad3ca] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        <RotateCcw className="size-3.5" /> Roll back
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-[#cad3ca] bg-white px-5 py-10 text-sm text-[#6c786f] xl:col-span-2">
                No governed weight versions exist. The built-in v2.0.0 weights
                remain in effect.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
