"use client";

import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  PackagePlus,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { Product } from "@/lib/products/types";

interface ProductIntakeDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (products: Product[]) => void;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const initialForm = {
  marketplace: "Amazon",
  marketplaceProductId: "",
  name: "",
  productUrl: "",
  affiliateUrl: "",
  category: "",
  currentPrice: "",
  originalPrice: "",
  rating: "",
  reviewCount: "",
  commissionRate: "",
  sellerName: "",
  notes: "",
  tags: "",
};

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

export function ProductIntakeDialog({
  open,
  onClose,
  onCreated,
}: ProductIntakeDialogProps) {
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [form, setForm] = useState(initialForm);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function submitManual(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          marketplace: form.marketplace,
          marketplaceProductId: form.marketplaceProductId,
          name: form.name,
          productUrl: form.productUrl,
          affiliateUrl: form.affiliateUrl || null,
          category: form.category,
          currentPrice: Number(form.currentPrice),
          originalPrice: optionalNumber(form.originalPrice),
          rating: optionalNumber(form.rating),
          reviewCount: optionalNumber(form.reviewCount) ?? 0,
          commissionRate: optionalNumber(form.commissionRate),
          sellerRating: null,
          sellerName: form.sellerName || null,
          stockStatus: "UNKNOWN",
          returnRisk: "UNKNOWN",
          status: "NEW",
          notes: form.notes || null,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const result = (await response.json()) as ApiEnvelope<Product>;
      if (!response.ok || !result.data) {
        throw new Error(result.error?.message ?? "Product could not be added.");
      }
      onCreated([result.data]);
      setForm(initialForm);
      setMessage("Product added and scored.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Product could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCsv(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/products/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const result = (await response.json()) as ApiEnvelope<{
        imported: Product[];
        importedCount: number;
        errorCount: number;
        errors: Array<{ row: number; message: string }>;
      }>;
      if (!response.ok || !result.data) {
        throw new Error(result.error?.message ?? "CSV could not be imported.");
      }
      onCreated(result.data.imported);
      setMessage(
        `${result.data.importedCount} imported${
          result.data.errorCount
            ? ` · ${result.data.errorCount} row${result.data.errorCount === 1 ? "" : "s"} need attention`
            : ""
        }.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "CSV could not be imported.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#0d1f15]/50 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-intake-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/30 bg-[#f8faf7] shadow-[0_32px_100px_rgba(9,35,20,0.3)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#dfe5de] bg-[#f8faf7]/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#4b805a] uppercase">
              Product intake
            </p>
            <h2
              id="product-intake-title"
              className="mt-1 text-2xl font-semibold tracking-[-0.03em]"
            >
              Add opportunities to score
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close product intake"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl border border-[#d8ded7] bg-white text-[#647068]"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="px-5 py-5 sm:px-7">
          <div className="mb-6 inline-flex rounded-xl bg-[#e9eee8] p-1">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "manual"
                  ? "bg-white text-[#183f2a] shadow-sm"
                  : "text-[#657168]"
              }`}
            >
              <PackagePlus className="size-4" />
              Add manually
            </button>
            <button
              type="button"
              onClick={() => setMode("csv")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                mode === "csv"
                  ? "bg-white text-[#183f2a] shadow-sm"
                  : "text-[#657168]"
              }`}
            >
              <FileSpreadsheet className="size-4" />
              Import CSV
            </button>
          </div>

          {mode === "manual" ? (
            <form onSubmit={submitManual} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Marketplace">
                  <select
                    required
                    value={form.marketplace}
                    onChange={(event) =>
                      setForm({ ...form, marketplace: event.target.value })
                    }
                    className="field-control"
                  >
                    {["Amazon", "Flipkart", "Meesho", "Myntra", "AJIO"].map(
                      (marketplace) => (
                        <option key={marketplace}>{marketplace}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Marketplace product ID">
                  <input
                    required
                    value={form.marketplaceProductId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        marketplaceProductId: event.target.value,
                      })
                    }
                    className="field-control"
                    placeholder="e.g. B0D123ABC"
                  />
                </Field>
              </div>
              <Field label="Product name">
                <input
                  required
                  minLength={3}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="field-control"
                  placeholder="Product title"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product URL">
                  <input
                    required
                    type="url"
                    value={form.productUrl}
                    onChange={(event) =>
                      setForm({ ...form, productUrl: event.target.value })
                    }
                    className="field-control"
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Affiliate URL" optional>
                  <input
                    type="url"
                    value={form.affiliateUrl}
                    onChange={(event) =>
                      setForm({ ...form, affiliateUrl: event.target.value })
                    }
                    className="field-control"
                    placeholder="https://…"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Category">
                  <input
                    required
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className="field-control"
                    placeholder="Home & Kitchen"
                  />
                </Field>
                <Field label="Current price">
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.currentPrice}
                    onChange={(event) =>
                      setForm({ ...form, currentPrice: event.target.value })
                    }
                    className="field-control"
                    placeholder="799"
                  />
                </Field>
                <Field label="Original price" optional>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.originalPrice}
                    onChange={(event) =>
                      setForm({ ...form, originalPrice: event.target.value })
                    }
                    className="field-control"
                    placeholder="1499"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Rating" optional>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(event) =>
                      setForm({ ...form, rating: event.target.value })
                    }
                    className="field-control"
                    placeholder="4.5"
                  />
                </Field>
                <Field label="Reviews" optional>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.reviewCount}
                    onChange={(event) =>
                      setForm({ ...form, reviewCount: event.target.value })
                    }
                    className="field-control"
                    placeholder="2400"
                  />
                </Field>
                <Field label="Commission %" optional>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.commissionRate}
                    onChange={(event) =>
                      setForm({ ...form, commissionRate: event.target.value })
                    }
                    className="field-control"
                    placeholder="8"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Seller" optional>
                  <input
                    value={form.sellerName}
                    onChange={(event) =>
                      setForm({ ...form, sellerName: event.target.value })
                    }
                    className="field-control"
                    placeholder="Seller name"
                  />
                </Field>
                <Field label="Tags" optional hint="Comma separated">
                  <input
                    value={form.tags}
                    onChange={(event) =>
                      setForm({ ...form, tags: event.target.value })
                    }
                    className="field-control"
                    placeholder="summer, under-1000"
                  />
                </Field>
              </div>
              <Field label="Internal notes" optional>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  className="field-control min-h-24 resize-y"
                  placeholder="Content angle, risk, or review notes…"
                />
              </Field>
              <SubmitRow
                busy={busy}
                message={message}
                label="Add and score product"
              />
            </form>
          ) : (
            <form onSubmit={submitCsv} className="space-y-5">
              <div className="rounded-2xl border border-dashed border-[#bfcabf] bg-white p-6 text-center">
                <Upload className="mx-auto size-7 text-[#438054]" />
                <h3 className="mt-3 font-semibold">Choose a CSV file</h3>
                <p className="mt-1 text-xs leading-5 text-[#758077]">
                  Up to 100 rows. Required columns: marketplace,
                  marketplaceProductId, name, productUrl, category,
                  currentPrice.
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setCsv(await file.text());
                      setMessage(`${file.name} ready to import.`);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="mt-4 rounded-xl border border-[#cad3ca] bg-[#f7f9f6] px-4 py-2.5 text-sm font-semibold"
                >
                  Select CSV
                </button>
              </div>
              <Field label="CSV preview">
                <textarea
                  required
                  value={csv}
                  onChange={(event) => setCsv(event.target.value)}
                  className="field-control min-h-48 font-mono text-xs"
                  placeholder="marketplace,marketplaceProductId,name,productUrl,category,currentPrice"
                />
              </Field>
              <SubmitRow
                busy={busy}
                message={message}
                label="Validate and import"
              />
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#526057]">
        <span>
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-[#9aa29c]">optional</span>
          ) : null}
        </span>
        {hint ? (
          <span className="font-normal text-[#929b94]">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function SubmitRow({
  busy,
  message,
  label,
}: {
  busy: boolean;
  message: string | null;
  label: string;
}) {
  return (
    <div className="flex flex-col-reverse items-start justify-between gap-3 border-t border-[#e2e7e1] pt-5 sm:flex-row sm:items-center">
      <div
        className="inline-flex min-h-6 items-center gap-2 text-xs text-[#637068]"
        aria-live="polite"
      >
        {message ? <CheckCircle2 className="size-4 text-[#3f8b54]" /> : null}
        {message}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173f2a] px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {label}
      </button>
    </div>
  );
}
