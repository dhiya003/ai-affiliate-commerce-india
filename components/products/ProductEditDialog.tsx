"use client";

import { LoaderCircle, Pencil, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  MARKETPLACES,
  RETURN_RISKS,
  STOCK_STATUSES,
  type Product,
} from "@/lib/products/types";

interface ProductEditDialogProps {
  open: boolean;
  product: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { message: string };
}

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function initialForm(product: Product) {
  return {
    marketplace: product.marketplace,
    marketplaceProductId: product.marketplaceProductId,
    name: product.name,
    description: product.description ?? "",
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl ?? "",
    imageUrl: product.imageUrl ?? "",
    category: product.category,
    sellerName: product.sellerName ?? "",
    currentPrice: String(product.currentPrice),
    originalPrice:
      product.originalPrice == null ? "" : String(product.originalPrice),
    rating: product.rating == null ? "" : String(product.rating),
    reviewCount: String(product.reviewCount),
    commissionRate:
      product.commissionRate == null ? "" : String(product.commissionRate),
    sellerRating:
      product.sellerRating == null ? "" : String(product.sellerRating),
    stockStatus: product.stockStatus,
    returnRisk: product.returnRisk,
    tags: product.tags.join(", "),
  };
}

export function ProductEditDialog({
  open,
  product,
  onClose,
  onSaved,
}: ProductEditDialogProps) {
  const [form, setForm] = useState(() => initialForm(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          marketplace: form.marketplace,
          marketplaceProductId: form.marketplaceProductId,
          name: form.name,
          description: form.description || null,
          productUrl: form.productUrl,
          affiliateUrl: form.affiliateUrl || null,
          imageUrl: form.imageUrl || null,
          category: form.category,
          sellerName: form.sellerName || null,
          currentPrice: Number(form.currentPrice),
          originalPrice: optionalNumber(form.originalPrice),
          rating: optionalNumber(form.rating),
          reviewCount: Number(form.reviewCount),
          commissionRate: optionalNumber(form.commissionRate),
          sellerRating: optionalNumber(form.sellerRating),
          stockStatus: form.stockStatus,
          returnRisk: form.returnRisk,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      const result = (await response.json()) as ApiEnvelope<Product>;
      if (!response.ok || !result.data) {
        throw new Error(
          result.error?.message ?? "Product could not be updated.",
        );
      }
      onSaved(result.data);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Product could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#0d1f15]/55 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-product-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-[#f8faf7] shadow-[0_32px_100px_rgba(9,35,20,0.34)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#dfe5de] bg-[#f8faf7]/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#4b805a] uppercase">
              <Pencil className="size-3.5" />
              Product editor
            </p>
            <h2
              id="edit-product-title"
              className="mt-1 text-2xl font-semibold tracking-[-0.03em]"
            >
              Update product facts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl border border-[#d8ded7] bg-white"
            aria-label="Close product editor"
          >
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marketplace">
              <select
                value={form.marketplace}
                onChange={(event) =>
                  setForm({
                    ...form,
                    marketplace: event.target.value as Product["marketplace"],
                  })
                }
                className="field-control"
              >
                {MARKETPLACES.map((marketplace) => (
                  <option key={marketplace}>{marketplace}</option>
                ))}
              </select>
            </Field>
            <Field label="Marketplace product ID">
              <input
                required
                value={form.marketplaceProductId}
                onChange={(event) =>
                  setForm({ ...form, marketplaceProductId: event.target.value })
                }
                className="field-control"
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
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="field-control min-h-24 resize-y"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category">
              <input
                required
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Current price">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.currentPrice}
                onChange={(event) =>
                  setForm({ ...form, currentPrice: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Original price">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.originalPrice}
                onChange={(event) =>
                  setForm({ ...form, originalPrice: event.target.value })
                }
                className="field-control"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Rating">
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
              />
            </Field>
            <Field label="Review count">
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.reviewCount}
                onChange={(event) =>
                  setForm({ ...form, reviewCount: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Commission %">
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
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Seller">
              <input
                value={form.sellerName}
                onChange={(event) =>
                  setForm({ ...form, sellerName: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Seller rating">
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.sellerRating}
                onChange={(event) =>
                  setForm({ ...form, sellerRating: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Tags">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stock status">
              <select
                value={form.stockStatus}
                onChange={(event) =>
                  setForm({
                    ...form,
                    stockStatus: event.target.value as Product["stockStatus"],
                  })
                }
                className="field-control"
              >
                {STOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Return risk">
              <select
                value={form.returnRisk}
                onChange={(event) =>
                  setForm({
                    ...form,
                    returnRisk: event.target.value as Product["returnRisk"],
                  })
                }
                className="field-control"
              >
                {RETURN_RISKS.map((risk) => (
                  <option key={risk}>{risk}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Product URL">
              <input
                required
                type="url"
                value={form.productUrl}
                onChange={(event) =>
                  setForm({ ...form, productUrl: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Affiliate URL">
              <input
                type="url"
                value={form.affiliateUrl}
                onChange={(event) =>
                  setForm({ ...form, affiliateUrl: event.target.value })
                }
                className="field-control"
              />
            </Field>
            <Field label="Image URL">
              <input
                type="url"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
                className="field-control"
              />
            </Field>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#ead1ca] bg-[#fff5f2] p-3 text-sm text-[#944a3d]"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end border-t border-[#e1e6e0] pt-5">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#173f2a] px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#526057]">
        {label}
      </span>
      {children}
    </label>
  );
}
