"use client";

import {
  ArrowLeft,
  BadgeIndianRupee,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  Product,
  ProductStatus,
  ProductStatusEvent,
} from "@/lib/products/types";
import { PRODUCT_STATUSES } from "@/lib/products/types";

interface ProductDetailClientProps {
  initialProduct: Product;
  initialStatusHistory: ProductStatusEvent[];
  userEmail: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const statusLabels: Record<ProductStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PROMOTED: "Promoted",
};

const factorLabels: Record<string, string> = {
  ratingScore: "Rating",
  reviewVolumeScore: "Review volume",
  discountScore: "Discount",
  commissionScore: "Commission",
  priceAttractivenessScore: "Price attractiveness",
  sellerQualityScore: "Seller quality",
  competitionScore: "Low competition",
  trendScore: "Trend",
  demandScore: "Demand",
  returnRiskPenalty: "Return-risk penalty",
};

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProductDetailClient({
  initialProduct,
  initialStatusHistory,
  userEmail,
}: ProductDetailClientProps) {
  const [product, setProduct] = useState(initialProduct);
  const [statusHistory, setStatusHistory] = useState(initialStatusHistory);
  const [statusNote, setStatusNote] = useState("");
  const [notes, setNotes] = useState(initialProduct.notes ?? "");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const scoreFactors = useMemo(() => {
    if (!product.score) return [];
    return Object.entries(product.score.breakdown);
  }, [product.score]);

  const discount =
    product.originalPrice && product.originalPrice > product.currentPrice
      ? Math.round(
          ((product.originalPrice - product.currentPrice) /
            product.originalPrice) *
            100,
        )
      : 0;
  const canEdit = product.ownerEmail === userEmail;

  async function updateStatus(status: ProductStatus) {
    setBusyAction(status);
    setMessage(null);
    try {
      const response = await fetch(`/api/products/${product.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note: statusNote || null }),
      });
      const result = (await response.json()) as ApiEnvelope<Product>;
      if (!response.ok || !result.data) {
        throw new Error(
          result.error?.message ?? "Status could not be updated.",
        );
      }
      const event: ProductStatusEvent = {
        id: crypto.randomUUID(),
        productId: product.id,
        changedByEmail: userEmail,
        fromStatus: product.status,
        toStatus: status,
        note: statusNote || null,
        changedAt: new Date().toISOString(),
      };
      setProduct(result.data);
      setStatusHistory((current) => [event, ...current]);
      setStatusNote("");
      setMessage(`Marked ${statusLabels[status].toLowerCase()}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Status could not be updated.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function recalculateScore() {
    setBusyAction("score");
    setMessage(null);
    try {
      const response = await fetch(`/api/products/${product.id}/score`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiEnvelope<Product>;
      if (!response.ok || !result.data) {
        throw new Error(
          result.error?.message ?? "Score could not be recalculated.",
        );
      }
      setProduct(result.data);
      setMessage("Opportunity score recalculated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Score could not be recalculated.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function saveNotes() {
    setBusyAction("notes");
    setMessage(null);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const result = (await response.json()) as ApiEnvelope<Product>;
      if (!response.ok || !result.data) {
        throw new Error(result.error?.message ?? "Notes could not be saved.");
      }
      setProduct(result.data);
      setMessage("Internal notes saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Notes could not be saved.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteCurrentProduct() {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setBusyAction("delete");
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = (await response.json()) as ApiEnvelope<unknown>;
        throw new Error(
          result.error?.message ?? "Product could not be deleted.",
        );
      }
      window.location.href = "/dashboard";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Product could not be deleted.",
      );
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="sticky top-0 z-30 border-b border-[#dce2db] bg-[#f7f8f5]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-4 px-4 sm:px-7 lg:px-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#d7ddd6] bg-white px-3.5 py-2.5 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Today’s picks</span>
          </Link>
          <div className="min-w-0">
            <p className="truncate text-xs text-[#7b867e]">
              {product.marketplace} · {product.marketplaceProductId}
            </p>
            <p className="truncate text-sm font-semibold">{product.name}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={deleteCurrentProduct}
                disabled={busyAction === "delete"}
                className="grid size-10 place-items-center rounded-xl border border-[#e4d4d0] bg-white text-[#ae4a38] disabled:opacity-50"
                aria-label="Delete product"
              >
                {busyAction === "delete" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            ) : null}
            <a
              href={product.affiliateUrl ?? product.productUrl}
              target="_blank"
              rel="noreferrer sponsored"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173f2a] px-4 text-sm font-semibold text-white"
            >
              Open product
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-[#dce2db] bg-white shadow-[0_14px_44px_rgba(40,62,48,0.06)]">
              <div className="grid md:grid-cols-[0.72fr_1.28fr]">
                <div className="relative grid min-h-64 place-items-center bg-[linear-gradient(145deg,#dff1e3,#fff4d5)] p-8">
                  <ShoppingBag
                    className="size-28 text-[#26723d] drop-shadow-sm"
                    strokeWidth={1.1}
                  />
                  <span className="absolute top-5 left-5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold tracking-wide text-[#4a594f] uppercase">
                    {product.category}
                  </span>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#eef2ed] px-2.5 py-1 text-[10px] font-bold text-[#607068]">
                          {product.marketplace}
                        </span>
                        <span className="rounded-full bg-[#e3f3e6] px-2.5 py-1 text-[10px] font-bold text-[#347348]">
                          {statusLabels[product.status]}
                        </span>
                      </div>
                      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                        {product.name}
                      </h1>
                    </div>
                    <div className="grid size-20 shrink-0 place-items-center rounded-full border-[6px] border-[#d9efde] bg-[#eff9f1] text-center">
                      <span className="text-2xl font-bold text-[#276f3c]">
                        {Math.round(product.opportunityScore ?? 0)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6d786f]">
                    {product.description ??
                      "No product description has been added yet."}
                  </p>
                  <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-[#edf0ec] pt-5">
                    <div>
                      <p className="text-2xl font-semibold">
                        {formatInr(product.currentPrice)}
                      </p>
                      <div className="flex gap-2 text-xs">
                        {product.originalPrice ? (
                          <span className="text-[#929a94] line-through">
                            {formatInr(product.originalPrice)}
                          </span>
                        ) : null}
                        {discount ? (
                          <span className="font-bold text-[#d45c44]">
                            {discount}% off
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Star className="size-4 fill-[#f4b640] text-[#f4b640]" />
                      {product.rating ?? "—"}
                      <span className="font-normal text-[#8a938c]">
                        ({product.reviewCount.toLocaleString("en-IN")} reviews)
                      </span>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold text-[#276f3c]">
                        ~
                        {formatInr(
                          product.score?.commissionEstimate ??
                            product.currentPrice *
                              ((product.commissionRate ?? 0) / 100),
                        )}
                      </p>
                      <p className="text-[11px] text-[#7d877f]">
                        estimated commission
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#dce2db] bg-white p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[#4c815b] uppercase">
                    Explainable score · {product.score?.version ?? "v1.0.0"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Why this opportunity ranks here
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707b73]">
                    {product.score?.explanation.formula ??
                      "Weighted rating, review, discount, commission, price, seller, competition, trend and demand signals."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={recalculateScore}
                  disabled={busyAction === "score"}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d5dcd4] bg-[#f8faf7] px-3.5 text-xs font-bold disabled:opacity-50"
                >
                  <RefreshCw
                    className={`size-3.5 ${busyAction === "score" ? "animate-spin" : ""}`}
                  />
                  Recalculate
                </button>
              </div>

              <div className="mt-7 grid gap-x-7 gap-y-5 sm:grid-cols-2">
                {scoreFactors.map(([factor, value]) => {
                  const penalty = factor === "returnRiskPenalty";
                  const numericValue = Number(value);
                  return (
                    <div key={factor}>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#536058]">
                          {factorLabels[factor] ?? factor}
                        </span>
                        <span
                          className={`font-bold ${
                            penalty ? "text-[#b45744]" : "text-[#286e3c]"
                          }`}
                        >
                          {penalty
                            ? `−${numericValue}`
                            : Math.round(numericValue)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#edf0ec]">
                        <div
                          className={`h-full rounded-full ${
                            penalty ? "bg-[#dc745f]" : "bg-[#4ca565]"
                          }`}
                          style={{ width: `${Math.min(100, numericValue)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                <Insight
                  icon={TrendingUp}
                  label="Strongest factors"
                  value={
                    product.score?.explanation.strongestFactors
                      .map((factor) => factorLabels[factor] ?? factor)
                      .join(", ") ?? "Not calculated"
                  }
                />
                <Insight
                  icon={BadgeIndianRupee}
                  label="Commission rate"
                  value={`${product.commissionRate ?? 0}%`}
                />
                <Insight
                  icon={ShieldCheck}
                  label="Return risk"
                  value={product.returnRisk.toLowerCase()}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-[#dce2db] bg-white p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#e4f2e7] text-[#317746]">
                  <Sparkles className="size-[18px]" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">Editorial workflow</h2>
                  <p className="mt-1 text-sm text-[#748078]">
                    Record your decision before generating and publishing
                    content.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {PRODUCT_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateStatus(status)}
                    disabled={busyAction !== null || product.status === status}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      product.status === status
                        ? "border-[#2f7d45] bg-[#e5f3e8] text-[#24683a]"
                        : status === "REJECTED"
                          ? "border-[#ead8d4] bg-[#fffafa] text-[#a34f3f]"
                          : "border-[#d6ddd5] bg-[#f9faf8] text-[#5e6b62]"
                    }`}
                  >
                    {product.status === status ? (
                      <Check className="size-3.5" />
                    ) : null}
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-[#617067]">
                  Decision note
                </span>
                <input
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  className="field-control"
                  placeholder="Optional reason or next step"
                  maxLength={500}
                />
              </label>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[#dce2db] bg-white p-6">
              <h2 className="font-semibold">Product facts</h2>
              <dl className="mt-4 divide-y divide-[#edf0ec]">
                {[
                  ["Marketplace", product.marketplace],
                  ["Seller", product.sellerName ?? "Not recorded"],
                  [
                    "Stock",
                    product.stockStatus.replaceAll("_", " ").toLowerCase(),
                  ],
                  ["Product ID", product.marketplaceProductId],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4 py-3 text-xs">
                    <dt className="w-24 shrink-0 text-[#879087]">{label}</dt>
                    <dd className="min-w-0 font-semibold break-words text-[#465249]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      product.affiliateUrl ?? product.productUrl,
                    );
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1_500);
                  }}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d6ddd5] text-xs font-bold"
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-10 place-items-center rounded-xl border border-[#d6ddd5]"
                  aria-label="Open original product page"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </section>

            <section className="rounded-3xl border border-[#dce2db] bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Internal notes</h2>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={busyAction === "notes"}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#317746] disabled:opacity-50"
                  >
                    {busyAction === "notes" ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save
                  </button>
                ) : null}
              </div>
              <textarea
                value={notes}
                readOnly={!canEdit}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-4 min-h-32 w-full resize-y rounded-xl border border-[#dce2db] bg-[#f8faf7] p-3 text-sm leading-6 outline-none focus:border-[#4c8b5d]"
                placeholder={
                  canEdit
                    ? "Add a content angle, concern, or next step…"
                    : "Change a workflow status to claim this sample and add notes."
                }
              />
            </section>

            <section className="rounded-3xl border border-[#dce2db] bg-white p-6">
              <h2 className="font-semibold">Status history</h2>
              {statusHistory.length ? (
                <ol className="mt-4 space-y-4">
                  {statusHistory.slice(0, 6).map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f3ea] text-[#347849]">
                        <PackageCheck className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">
                          {event.fromStatus
                            ? `${statusLabels[event.fromStatus]} → `
                            : ""}
                          {statusLabels[event.toStatus]}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#879087]">
                          {dateLabel(event.changedAt)}
                        </p>
                        {event.note ? (
                          <p className="mt-1 text-xs leading-5 text-[#69756d]">
                            {event.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-4 rounded-xl bg-[#f5f7f4] p-4 text-xs leading-5 text-[#78827b]">
                  No decisions recorded yet.
                </div>
              )}
            </section>

            {message ? (
              <div
                className="sticky bottom-4 flex items-start gap-3 rounded-2xl border border-[#cfe0d1] bg-[#eff8f1] p-4 text-xs font-semibold text-[#336d43] shadow-lg"
                role="status"
              >
                <CircleAlert className="size-4 shrink-0" />
                <span className="flex-1">{message}</span>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  aria-label="Dismiss message"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Insight({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f5f7f4] p-4">
      <Icon className="size-4 text-[#397b4c]" />
      <p className="mt-3 text-[10px] font-bold tracking-wide text-[#879087] uppercase">
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 font-semibold capitalize">{value}</p>
    </div>
  );
}
