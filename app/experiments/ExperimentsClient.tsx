"use client";

import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FlaskConical,
  LoaderCircle,
  MessageSquareText,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  ContentExperiment,
  ContentVariation,
} from "@/lib/experiments/types";
import type {
  LearningProfile,
  RecommendationFeedback,
} from "@/lib/learning/types";

interface ProductOption {
  id: string;
  name: string;
  marketplace: string;
  category: string;
}

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

interface ExperimentsClientProps {
  initialExperiments: ContentExperiment[];
  initialFeedback: RecommendationFeedback[];
  initialProfiles: LearningProfile[];
  products: ProductOption[];
  isAdmin: boolean;
}

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.data) {
    throw new Error(
      payload.error?.message ?? "The request could not be completed.",
    );
  }
  return payload.data;
}

function statusClass(status: string) {
  if (status === "RUNNING") return "bg-blue-50 text-blue-700";
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

export function ExperimentsClient({
  initialExperiments,
  initialFeedback,
  initialProfiles,
  products,
  isAdmin,
}: ExperimentsClientProps) {
  const [experiments, setExperiments] = useState(initialExperiments);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [variations, setVariations] = useState<ContentVariation[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [variationLoading, setVariationLoading] = useState(Boolean(productId));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((product) => product.id === productId);
  const productNames = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products],
  );

  useEffect(() => {
    if (!productId) return;
    let active = true;
    void fetch(
      `/api/content-variations?productId=${encodeURIComponent(productId)}`,
    )
      .then(readResponse<ContentVariation[]>)
      .then((rows) => {
        if (active) setVariations(rows);
      })
      .catch((caught: unknown) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Variations failed to load.",
          );
      })
      .finally(() => {
        if (active) setVariationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  function begin(key: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
  }

  function fail(caught: unknown) {
    setError(caught instanceof Error ? caught.message : "The request failed.");
    setBusy(null);
  }

  async function createVariation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("variation");
    const form = new FormData(event.currentTarget);
    try {
      const variation = await readResponse<ContentVariation>(
        await fetch("/api/content-variations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            productId,
            label: form.get("label"),
            platform: form.get("platform"),
            hook: form.get("hook") || null,
            caption: form.get("caption") || null,
            cta: form.get("cta") || null,
            audienceAngle: form.get("audienceAngle") || null,
            tone: form.get("tone") || null,
            hashtags: [],
          }),
        }),
      );
      setVariations((current) => [variation, ...current]);
      setNotice(`Variation “${variation.label}” is ready.`);
      event.currentTarget.reset();
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function createExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("experiment");
    const form = new FormData(event.currentTarget);
    const allocation = 100 / selectedVariations.length;
    try {
      const experiment = await readResponse<ContentExperiment>(
        await fetch("/api/experiments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            productId,
            name: form.get("name"),
            hypothesis: form.get("hypothesis"),
            primaryMetric: form.get("primaryMetric"),
            confidenceThreshold: Number(form.get("confidenceThreshold")),
            variations: selectedVariations.map((variationId, index) => ({
              variationId,
              allocationPercent:
                index === selectedVariations.length - 1
                  ? 100 - allocation * index
                  : allocation,
            })),
          }),
        }),
      );
      setExperiments((current) => [experiment, ...current]);
      setSelectedVariations([]);
      setNotice(`Experiment “${experiment.name}” was created as a draft.`);
      event.currentTarget.reset();
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function experimentAction(
    experiment: ContentExperiment,
    action: "start" | "calculate" | "select-winner" | "archive",
    variationId?: string,
  ) {
    begin(`${experiment.id}:${action}:${variationId ?? ""}`);
    try {
      const updated = await readResponse<ContentExperiment>(
        await fetch(`/api/experiments/${experiment.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, variationId }),
        }),
      );
      setExperiments((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setNotice(
        `Experiment “${updated.name}” is now ${updated.status.toLowerCase()}.`,
      );
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function recordFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("feedback");
    const form = new FormData(event.currentTarget);
    try {
      const created = await readResponse<RecommendationFeedback>(
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            productId: form.get("productId"),
            action: form.get("action"),
            reason: form.get("reason") || null,
            audience: form.get("audience") || null,
            season: form.get("season") || null,
            festival: form.get("festival") || null,
            metadata: {},
          }),
        }),
      );
      const enriched = {
        ...created,
        productName:
          productNames.get(created.productId) ?? "Owner-visible product",
        marketplace:
          products.find((product) => product.id === created.productId)
            ?.marketplace ?? "",
        category:
          products.find((product) => product.id === created.productId)
            ?.category ?? "",
      };
      setFeedback((current) => [enriched, ...current]);
      setNotice("Recommendation feedback was recorded.");
      event.currentTarget.reset();
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function refreshLearning() {
    begin("learning");
    try {
      const updated = await readResponse<LearningProfile[]>(
        await fetch("/api/learning", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }),
      );
      setProfiles(updated);
      setNotice(
        "Learning profiles were rebuilt from the last 90 days of evidence.",
      );
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
            href="/dashboard"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Phase 3 optimization
            </p>
            <p className="mt-1 font-semibold">Experiments & learning</p>
          </div>
          <Link
            href="/performance"
            className="ml-auto rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
          >
            Performance
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section>
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            Evidence before optimization
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Test creative ideas, capture decisions, and learn what actually
            converts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a61]">
            Winners require measured conversion evidence and the configured
            confidence threshold. Profiles summarize evidence; they do not
            silently change scoring weights.
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

        <section className="grid gap-6 xl:grid-cols-2">
          <form
            onSubmit={(event) => void createVariation(event)}
            className="rounded-2xl border border-[#dce2db] bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-[#4c815b]" />
              <div>
                <h2 className="font-semibold">1. Create content variations</h2>
                <p className="text-xs text-[#6c786f]">
                  Store the creative elements you intend to test.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold sm:col-span-2">
                Product
                <select
                  value={productId}
                  onChange={(event) => {
                    setVariationLoading(true);
                    setSelectedVariations([]);
                    setProductId(event.target.value);
                  }}
                  className="field-control mt-1 w-full"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.marketplace}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Label
                <input
                  name="label"
                  required
                  maxLength={120}
                  className="field-control mt-1 w-full"
                  placeholder="Value-led hook"
                />
              </label>
              <label className="text-xs font-bold">
                Platform
                <select
                  name="platform"
                  className="field-control mt-1 w-full"
                  defaultValue="Instagram"
                >
                  <option>Instagram</option>
                  <option>YouTube</option>
                  <option>WhatsApp</option>
                  <option>Telegram</option>
                  <option>Website</option>
                </select>
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Hook
                <textarea
                  name="hook"
                  required
                  maxLength={1000}
                  className="field-control mt-1 min-h-20 w-full"
                  placeholder="The first line viewers will see"
                />
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Caption
                <textarea
                  name="caption"
                  maxLength={5000}
                  className="field-control mt-1 min-h-24 w-full"
                />
              </label>
              <label className="text-xs font-bold">
                CTA
                <input
                  name="cta"
                  maxLength={1000}
                  className="field-control mt-1 w-full"
                />
              </label>
              <label className="text-xs font-bold">
                Tone
                <input
                  name="tone"
                  maxLength={80}
                  className="field-control mt-1 w-full"
                  placeholder="Practical"
                />
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Audience angle
                <input
                  name="audienceAngle"
                  maxLength={1000}
                  className="field-control mt-1 w-full"
                  placeholder="Budget-conscious first-time buyers"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!productId || busy === "variation"}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#102c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "variation" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Save variation
            </button>
          </form>

          <form
            onSubmit={(event) => void createExperiment(event)}
            className="rounded-2xl border border-[#dce2db] bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <FlaskConical className="size-5 text-[#4c815b]" />
              <div>
                <h2 className="font-semibold">2. Configure an experiment</h2>
                <p className="text-xs text-[#6c786f]">
                  Select 2–5 variations; traffic is split evenly.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold sm:col-span-2">
                Experiment name
                <input
                  name="name"
                  required
                  minLength={3}
                  maxLength={160}
                  className="field-control mt-1 w-full"
                  placeholder="Value hook vs urgency hook"
                />
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Hypothesis
                <textarea
                  name="hypothesis"
                  required
                  minLength={10}
                  maxLength={2000}
                  className="field-control mt-1 min-h-20 w-full"
                  placeholder="A concrete, falsifiable expectation"
                />
              </label>
              <label className="text-xs font-bold">
                Primary metric
                <select
                  name="primaryMetric"
                  className="field-control mt-1 w-full"
                  defaultValue="CONVERSION_RATE"
                >
                  <option value="CLICKS">Clicks</option>
                  <option value="CONVERSIONS">Conversions</option>
                  <option value="CONVERSION_RATE">Conversion rate</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="EARNINGS_PER_CLICK">Earnings per click</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Confidence threshold
                <select
                  name="confidenceThreshold"
                  className="field-control mt-1 w-full"
                  defaultValue="0.95"
                >
                  <option value="0.8">80%</option>
                  <option value="0.9">90%</option>
                  <option value="0.95">95%</option>
                  <option value="0.99">99%</option>
                </select>
              </label>
            </div>
            <div className="mt-4 space-y-2">
              {variationLoading ? (
                <p className="text-sm text-[#6c786f]">Loading variations…</p>
              ) : variations.length ? (
                variations
                  .filter((variation) => !variation.archivedAt)
                  .map((variation) => (
                    <label
                      key={variation.id}
                      className="flex items-start gap-3 rounded-xl border border-[#e2e7e1] p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVariations.includes(variation.id)}
                        disabled={
                          !selectedVariations.includes(variation.id) &&
                          selectedVariations.length >= 5
                        }
                        onChange={(event) =>
                          setSelectedVariations((current) =>
                            event.target.checked
                              ? [...current, variation.id]
                              : current.filter((id) => id !== variation.id),
                          )
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {variation.label}
                        </span>
                        <span className="text-xs text-[#6c786f]">
                          {variation.platform} ·{" "}
                          {variation.hook ?? variation.caption}
                        </span>
                      </span>
                    </label>
                  ))
              ) : (
                <p className="rounded-xl bg-[#f5f7f4] px-4 py-5 text-sm text-[#6c786f]">
                  Create at least two variations for{" "}
                  {selectedProduct?.name ?? "this product"}.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={selectedVariations.length < 2 || busy === "experiment"}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#102c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "experiment" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FlaskConical className="size-4" />
              )}
              Create draft
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#4c815b] uppercase">
                Measured experiments
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Experiment ledger</h2>
            </div>
            <span className="text-sm text-[#6c786f]">
              {experiments.length} total
            </span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {experiments.length ? (
              experiments.map((experiment) => (
                <article
                  key={experiment.id}
                  className="rounded-2xl border border-[#dce2db] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#6c786f]">
                        {productNames.get(experiment.productId) ??
                          experiment.productId}
                      </p>
                      <h3 className="mt-1 font-semibold">{experiment.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#5d6a61]">
                        {experiment.hypothesis}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(experiment.status)}`}
                    >
                      {experiment.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {experiment.variations.map((variation) => (
                      <div
                        key={variation.id}
                        className="rounded-xl bg-[#f5f7f4] p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">
                            {variation.label} ·{" "}
                            {variation.allocationPercent.toFixed(0)}%
                          </p>
                          {variation.isWinner ? (
                            <Trophy className="size-4 text-amber-600" />
                          ) : null}
                        </div>
                        {variation.result ? (
                          <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-[#5d6a61]">
                            <span>{variation.result.clicks} clicks</span>
                            <span>{variation.result.conversions} sales</span>
                            <span>
                              {variation.result.conversionRate.toFixed(2)}% CVR
                            </span>
                            <span>
                              {(variation.result.confidence * 100).toFixed(1)}%
                              confidence
                            </span>
                          </div>
                        ) : (
                          <p className="mt-2 text-[11px] text-[#6c786f]">
                            No result snapshot yet.
                          </p>
                        )}
                        {experiment.status === "RUNNING" && variation.result ? (
                          <button
                            type="button"
                            onClick={() =>
                              void experimentAction(
                                experiment,
                                "select-winner",
                                variation.id,
                              )
                            }
                            disabled={
                              busy !== null ||
                              variation.result.confidence <
                                experiment.confidenceThreshold
                            }
                            className="mt-2 text-[11px] font-bold text-[#2f6e42] disabled:text-[#9ba49d]"
                          >
                            Select winner
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {experiment.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void experimentAction(experiment, "start")
                        }
                        disabled={busy !== null}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#102c1e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <Play className="size-3.5" /> Start
                      </button>
                    ) : null}
                    {experiment.status === "RUNNING" ||
                    experiment.status === "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void experimentAction(experiment, "calculate")
                        }
                        disabled={busy !== null}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#cad3ca] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        <BarChart3 className="size-3.5" /> Calculate
                      </button>
                    ) : null}
                    {experiment.status !== "ARCHIVED" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void experimentAction(experiment, "archive")
                        }
                        disabled={busy !== null}
                        className="rounded-lg border border-[#cad3ca] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        Archive
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-[#cad3ca] bg-white px-5 py-10 text-sm text-[#6c786f] xl:col-span-2">
                No experiments yet. Create two variations, then define the first
                test.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={(event) => void recordFeedback(event)}
            className="rounded-2xl border border-[#dce2db] bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <MessageSquareText className="size-5 text-[#4c815b]" />
              <div>
                <h2 className="font-semibold">Recommendation feedback</h2>
                <p className="text-xs text-[#6c786f]">
                  Record why an opportunity was used or rejected.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold sm:col-span-2">
                Product
                <select
                  name="productId"
                  required
                  className="field-control mt-1 w-full"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.marketplace}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Decision
                <select
                  name="action"
                  className="field-control mt-1 w-full"
                  defaultValue="APPROVED"
                >
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PROMOTED">Promoted</option>
                  <option value="SKIPPED">Skipped</option>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="UNSUCCESSFUL">Unsuccessful</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Audience
                <input
                  name="audience"
                  maxLength={300}
                  className="field-control mt-1 w-full"
                />
              </label>
              <label className="text-xs font-bold">
                Season
                <input
                  name="season"
                  maxLength={120}
                  className="field-control mt-1 w-full"
                  placeholder="Monsoon"
                />
              </label>
              <label className="text-xs font-bold">
                Festival
                <input
                  name="festival"
                  maxLength={120}
                  className="field-control mt-1 w-full"
                  placeholder="Diwali"
                />
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Reason
                <textarea
                  name="reason"
                  maxLength={2000}
                  className="field-control mt-1 min-h-20 w-full"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!products.length || busy === "feedback"}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#102c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "feedback" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <MessageSquareText className="size-4" />
              )}{" "}
              Record feedback
            </button>
            <div className="mt-5 space-y-2">
              {feedback.slice(0, 5).map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl bg-[#f5f7f4] p-3 text-xs"
                >
                  <span className="font-bold">{row.action}</span> ·{" "}
                  {row.productName}
                  {row.reason ? (
                    <p className="mt-1 text-[#6c786f]">{row.reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </form>

          <section className="overflow-hidden rounded-2xl border border-[#dce2db] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#e2e7e1] px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  Evidence-backed learning profiles
                </h2>
                <p className="mt-1 text-xs text-[#6c786f]">
                  Observed performance by marketplace, category, audience,
                  creative and timing.
                </p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => void refreshLearning()}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#cad3ca] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  <RefreshCw
                    className={`size-3.5 ${busy === "learning" ? "animate-spin" : ""}`}
                  />{" "}
                  Refresh
                </button>
              ) : null}
            </div>
            {profiles.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-[#f5f7f4] text-[#6c786f]">
                    <tr>
                      <th className="px-5 py-3">Dimension</th>
                      <th className="px-3 py-3">Value</th>
                      <th className="px-3 py-3">Evidence</th>
                      <th className="px-3 py-3">CVR</th>
                      <th className="px-3 py-3">EPC</th>
                      <th className="px-5 py-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.slice(0, 30).map((profile) => (
                      <tr
                        key={profile.id}
                        className="border-t border-[#edf0ec]"
                      >
                        <td className="px-5 py-3.5 font-semibold">
                          {profile.dimension.replaceAll("_", " ")}
                        </td>
                        <td className="max-w-52 truncate px-3 py-3.5">
                          {profile.dimensionKey}
                        </td>
                        <td className="px-3 py-3.5">
                          {profile.observationCount}
                        </td>
                        <td className="px-3 py-3.5">
                          {profile.conversionRate.toFixed(2)}%
                        </td>
                        <td className="px-3 py-3.5">
                          {money.format(profile.earningsPerClick)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {(profile.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-10 text-sm text-[#6c786f]">
                No learning profile exists yet. An administrator can build one
                after tracked clicks, conversions, or feedback are available.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
