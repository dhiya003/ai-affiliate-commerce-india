"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  LoaderCircle,
  PackagePlus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ProductIntakeDialog } from "@/components/products/ProductIntakeDialog";
import { ProductMedia } from "@/components/products/ProductMedia";
import {
  MARKETPLACES,
  PRODUCT_STATUSES,
  type Product,
  type ProductListResult,
  type ProductStatus,
} from "@/lib/products/types";

interface ProductCatalogClientProps {
  initialCategories: string[];
  initialResult: ProductListResult;
  userName: string;
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

const initialFilters = {
  q: "",
  marketplace: "",
  category: "",
  status: "",
  minRating: "",
  minPrice: "",
  maxPrice: "",
  sort: "score",
};

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCatalogClient({
  initialCategories,
  initialResult,
  userName,
}: ProductCatalogClientProps) {
  const [result, setResult] = useState(initialResult);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const [categories, setCategories] = useState(initialCategories);

  async function loadProducts(page = 1) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "12",
      sort: filters.sort,
    });
    for (const [key, value] of Object.entries(filters)) {
      if (key !== "sort" && value.trim()) params.set(key, value.trim());
    }

    try {
      const response = await fetch(`/api/products?${params}`);
      const payload = (await response.json()) as ApiEnvelope<ProductListResult>;
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Products could not be loaded.",
        );
      }
      setResult(payload.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Products could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    void loadProducts(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setLoading(true);
    setError(null);
    void fetch("/api/products?page=1&pageSize=12&sort=score")
      .then(async (response) => {
        const payload =
          (await response.json()) as ApiEnvelope<ProductListResult>;
        if (!response.ok || !payload.data) {
          throw new Error(
            payload.error?.message ?? "Products could not be loaded.",
          );
        }
        setResult(payload.data);
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Products could not be loaded.",
        );
      })
      .finally(() => setLoading(false));
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="sticky top-0 z-30 border-b border-[#dce2db] bg-[#f8f9f6]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:px-7 lg:px-10">
          <Link
            href="/dashboard"
            className="grid size-10 place-items-center rounded-xl border border-[#d7ddd6] bg-white"
            aria-label="Back to today's picks"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#173f2a] text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="hidden sm:inline">Affinity India</span>
          </Link>
          <div className="ml-auto hidden text-right sm:block">
            <p className="text-xs font-semibold">{userName}</p>
            <p className="text-[11px] text-[#849087]">Product workspace</p>
          </div>
          <button
            type="button"
            onClick={() => setIntakeOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173f2a] px-3.5 text-xs font-bold text-white"
          >
            <PackagePlus className="size-4" />
            Add product
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-[#4c815b] uppercase">
              Product catalogue
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Every opportunity, one workspace
            </h1>
            <p className="mt-2 text-sm text-[#6f7a72]">
              Search, filter and review {result.pagination.total} marketplace
              products.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#d4dbd3] bg-white px-4 text-sm font-semibold lg:hidden"
          >
            {filtersOpen ? (
              <X className="size-4" />
            ) : (
              <Filter className="size-4" />
            )}
            {filtersOpen ? "Close filters" : "Filter products"}
          </button>
        </section>

        <form
          onSubmit={submitFilters}
          className={`mt-7 rounded-2xl border border-[#dce2db] bg-white p-4 shadow-[0_8px_28px_rgba(40,62,48,0.04)] ${
            filtersOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(130px,0.65fr))]">
            <label className="relative">
              <span className="sr-only">Search catalogue</span>
              <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#849087]" />
              <input
                type="search"
                value={filters.q}
                onChange={(event) =>
                  setFilters({ ...filters, q: event.target.value })
                }
                placeholder="Search name, category or product ID"
                className="field-control pl-10"
              />
            </label>
            <select
              value={filters.marketplace}
              onChange={(event) =>
                setFilters({ ...filters, marketplace: event.target.value })
              }
              className="field-control"
              aria-label="Marketplace"
            >
              <option value="">All marketplaces</option>
              {MARKETPLACES.map((marketplace) => (
                <option key={marketplace}>{marketplace}</option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters({ ...filters, category: event.target.value })
              }
              className="field-control"
              aria-label="Category"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({ ...filters, status: event.target.value })
              }
              className="field-control"
              aria-label="Workflow status"
            >
              <option value="">All statuses</option>
              {PRODUCT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(120px,0.65fr))_auto_auto]">
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={filters.minRating}
              onChange={(event) =>
                setFilters({ ...filters, minRating: event.target.value })
              }
              placeholder="Minimum rating"
              className="field-control"
              aria-label="Minimum rating"
            />
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={(event) =>
                setFilters({ ...filters, minPrice: event.target.value })
              }
              placeholder="Minimum price"
              className="field-control"
              aria-label="Minimum price"
            />
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(event) =>
                setFilters({ ...filters, maxPrice: event.target.value })
              }
              placeholder="Maximum price"
              className="field-control"
              aria-label="Maximum price"
            />
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters({ ...filters, sort: event.target.value })
              }
              className="field-control"
              aria-label="Sort products"
            >
              <option value="score">Highest score</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest rating</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-[#d6ddd5] px-4 text-xs font-bold text-[#68736b]"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173f2a] px-5 text-xs font-bold text-white disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Apply filters
            </button>
          </div>
        </form>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-[#ead1ca] bg-[#fff5f2] p-4 text-sm text-[#944a3d]"
          >
            <CircleAlert className="size-5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="relative mt-6 min-h-72">
          {loading ? (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[#f3f5f1]/80 backdrop-blur-[2px]">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-lg">
                <LoaderCircle className="size-4 animate-spin text-[#337849]" />
                Loading products
              </div>
            </div>
          ) : null}

          {result.products.length ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>
          ) : (
            <section className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-[#cbd4ca] bg-white p-8 text-center">
              <div>
                <ShoppingBag className="mx-auto size-10 text-[#7c9a83]" />
                <h2 className="mt-3 text-lg font-semibold">
                  No products found
                </h2>
                <p className="mt-1 text-sm text-[#78837b]">
                  Clear a filter or add a new product to this workspace.
                </p>
              </div>
            </section>
          )}
        </div>

        <nav
          className="mt-7 flex items-center justify-between rounded-2xl border border-[#dce2db] bg-white p-3"
          aria-label="Product pages"
        >
          <button
            type="button"
            disabled={loading || result.pagination.page <= 1}
            onClick={() => void loadProducts(result.pagination.page - 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d6ddd5] px-3 text-xs font-bold disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <p className="text-xs text-[#78837b]">
            Page{" "}
            <strong className="text-[#354239]">{result.pagination.page}</strong>{" "}
            of {result.pagination.totalPages}
          </p>
          <button
            type="button"
            disabled={
              loading || result.pagination.page >= result.pagination.totalPages
            }
            onClick={() => void loadProducts(result.pagination.page + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d6ddd5] px-3 text-xs font-bold disabled:opacity-40"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </nav>
      </div>

      <ProductIntakeDialog
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={(created) => {
          setCategories((current) =>
            [
              ...new Set([
                ...current,
                ...created.map((product) => product.category),
              ]),
            ].sort(),
          );
          setResult((current) => ({
            products: [...created, ...current.products].slice(0, 12),
            pagination: {
              ...current.pagination,
              total: current.pagination.total + created.length,
              totalPages: Math.max(
                1,
                Math.ceil((current.pagination.total + created.length) / 12),
              ),
            },
          }));
        }}
      />
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount =
    product.originalPrice && product.originalPrice > product.currentPrice
      ? Math.round(
          ((product.originalPrice - product.currentPrice) /
            product.originalPrice) *
            100,
        )
      : 0;

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#dce2db] bg-white shadow-[0_8px_26px_rgba(40,62,48,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(40,62,48,0.09)]">
      <div className="grid h-36 place-items-center overflow-hidden bg-[linear-gradient(145deg,#dff1e3,#fff4d5)] text-[#26723d]">
        <ProductMedia
          imageUrl={product.imageUrl}
          alt={`${product.name} product image`}
          imageClassName="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
          iconClassName="size-14 opacity-80 drop-shadow-sm"
        />
      </div>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-wide uppercase">
            <span className="rounded-full bg-[#eef2ed] px-2 py-1 text-[#607068]">
              {product.marketplace}
            </span>
            <span className="rounded-full bg-[#e4f2e7] px-2 py-1 text-[#317746]">
              {statusLabels[product.status]}
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-lg font-semibold tracking-[-0.02em]">
            {product.name}
          </h2>
          <p className="mt-1 text-xs text-[#7d877f]">{product.category}</p>
        </div>
        <span className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-[#d9efde] bg-[#eff9f1] text-lg font-bold text-[#276f3c]">
          {Math.round(product.opportunityScore ?? 0)}
        </span>
      </div>
      <div className="mx-5 flex items-end justify-between border-y border-[#edf0ec] py-4">
        <div>
          <p className="text-lg font-semibold">
            {formatInr(product.currentPrice)}
          </p>
          <p className="text-[11px] font-semibold text-[#d45c44]">
            {discount
              ? `${discount}% below original price`
              : "Current listing price"}
          </p>
        </div>
        <p className="inline-flex items-center gap-1 text-xs font-semibold">
          <Star className="size-3.5 fill-[#f4b640] text-[#f4b640]" />
          {product.rating ?? "—"}
          <span className="font-normal text-[#8a938c]">
            ({product.reviewCount.toLocaleString("en-IN")})
          </span>
        </p>
      </div>
      <div className="flex items-center justify-between p-5">
        <p className="text-[11px] text-[#869088]">
          {product.ownerEmail ? "Your product" : "Sample opportunity"}
        </p>
        <Link
          href={`/products/${encodeURIComponent(product.id)}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173f2a] px-4 text-xs font-bold text-white"
        >
          Open product
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
