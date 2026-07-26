"use client";

import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  CircleHelp,
  Flame,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductIntakeDialog } from "@/components/products/ProductIntakeDialog";
import { ProductMedia } from "@/components/products/ProductMedia";
import type { Product } from "@/lib/products/types";
import type { DashboardProduct } from "@/lib/sample-products";
import { chatGPTSignOutPath } from "../chatgpt-auth";

interface DashboardClientProps {
  products: DashboardProduct[];
  user: {
    displayName: string;
    email: string;
    role: "ADMIN" | "USER";
  };
}

const marketplaces = ["All", "Amazon", "Flipkart", "Meesho", "Myntra", "AJIO"];

const accentClasses: Record<string, string> = {
  violet: "from-violet-200 via-violet-100 to-white text-violet-800",
  rose: "from-rose-200 via-orange-100 to-white text-rose-800",
  amber: "from-amber-200 via-yellow-100 to-white text-amber-800",
  cyan: "from-cyan-200 via-teal-100 to-white text-cyan-800",
  blue: "from-blue-200 via-indigo-100 to-white text-blue-800",
  lime: "from-lime-200 via-emerald-100 to-white text-emerald-800",
};

const marketplaceAccents: Record<string, string> = {
  Amazon: "violet",
  Flipkart: "cyan",
  Meesho: "amber",
  Myntra: "rose",
  AJIO: "blue",
};

function toDashboardProduct(product: Product): DashboardProduct {
  const originalPrice = product.originalPrice ?? product.currentPrice;
  return {
    id: product.id,
    name: product.name,
    marketplace: product.marketplace,
    category: product.category,
    price: product.currentPrice,
    originalPrice,
    rating: product.rating ?? 0,
    reviews: product.reviewCount,
    commissionRate: product.commissionRate ?? 0,
    sellerRating: product.sellerRating ?? 0,
    returnRisk: product.returnRisk,
    trendScore: product.score?.breakdown.trendScore ?? 50,
    competitionScore: product.score?.breakdown.competitionScore ?? 50,
    demandScore: product.score?.breakdown.demandScore ?? 50,
    accent: marketplaceAccents[product.marketplace] ?? "lime",
    status: product.status,
    opportunityScore: product.opportunityScore ?? 0,
    commissionEstimate: product.score?.commissionEstimate ?? 0,
    discount:
      originalPrice > product.currentPrice
        ? Math.round(
            ((originalPrice - product.currentPrice) / originalPrice) * 100,
          )
        : 0,
    strongestFactors: product.score?.explanation.strongestFactors ?? [],
    imageUrl: product.imageUrl,
  };
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardClient({ products, user }: DashboardClientProps) {
  const [liveProducts, setLiveProducts] =
    useState<DashboardProduct[]>(products);
  const [marketplace, setMarketplace] = useState("All");
  const [query, setQuery] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [savedProducts, setSavedProducts] = useState<string[]>([]);
  const [intakeOpen, setIntakeOpen] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch("/api/products?pageSize=50&sort=score")
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as {
          data?: { products: Product[] };
        };
        if (active && result.data?.products.length) {
          setLiveProducts(result.data.products.map(toDashboardProduct));
        }
      })
      .catch(() => {
        // The server-rendered seed set remains a useful offline fallback.
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return liveProducts.filter(
      (product) =>
        (marketplace === "All" || product.marketplace === marketplace) &&
        (!normalizedQuery ||
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.category.toLowerCase().includes(normalizedQuery)),
    );
  }, [liveProducts, marketplace, query]);

  function toggleSaved(productId: string) {
    setSavedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#dce2db] bg-[#102c1e] px-4 py-5 text-white transition-transform duration-300 lg:translate-x-0 ${mobileNavigationOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#49b968]">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            Affinity India
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileNavigationOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-9 space-y-1" aria-label="Primary navigation">
          {[
            [LayoutDashboard, "Today’s picks", "/dashboard", true],
            [ShoppingBag, "All products", "/products", false],
            [WandSparkles, "Content studio", "/products", false],
            [Bookmark, "Saved", "#saved", false],
            [BarChart3, "Performance", "#performance", false],
          ].map(([Icon, label, href, active]) => {
            const NavIcon = Icon as typeof LayoutDashboard;
            return (
              <Link
                key={label as string}
                href={href as string}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? "bg-white text-[#163f2a] shadow-sm"
                    : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <NavIcon className="size-[18px]" aria-hidden="true" />
                <span>{label as string}</span>
                {label === "Saved" && savedProducts.length > 0 ? (
                  <span className="ml-auto rounded-full bg-[#49b968] px-2 py-0.5 text-[10px] font-bold text-white">
                    {savedProducts.length}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/6 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7fe099]">
              <Flame className="size-4" aria-hidden="true" />
              Daily opportunity brief
            </div>
            <p className="mt-2 text-xs leading-5 text-white/55">
              18 products moved up today. Three are ready for review.
            </p>
          </div>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/8 hover:text-white"
          >
            <CircleHelp className="size-[18px]" aria-hidden="true" />
            Help & onboarding
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/8 hover:text-white"
          >
            <Settings className="size-[18px]" aria-hidden="true" />
            Settings
          </a>
        </div>
      </aside>

      {mobileNavigationOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavigationOpen(false)}
        />
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-[#dce2db] bg-[#f7f8f5]/92 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <button
            type="button"
            aria-label="Open navigation"
            className="grid size-10 place-items-center rounded-xl border border-[#d8ddd7] bg-white lg:hidden"
            onClick={() => setMobileNavigationOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <label className="relative hidden max-w-md flex-1 sm:block">
            <Search
              className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#7a867d]"
              aria-hidden="true"
            />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or categories"
              className="h-10 w-full rounded-xl border border-[#d8ddd7] bg-white pr-4 pl-10 text-sm outline-none placeholder:text-[#9aa39c] focus:border-[#4b8c5c] focus:ring-3 focus:ring-[#4b8c5c]/10"
            />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid size-10 place-items-center rounded-xl border border-[#d8ddd7] bg-white text-[#566159]"
            >
              <Bell className="size-[18px]" />
              <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-[#e9654b]" />
            </button>
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[#d8ddd7] bg-white p-1.5 pr-3 text-left"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-[#dff1e2] text-xs font-bold text-[#27683a]">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate text-xs font-semibold md:block">
                  {user.displayName}
                </span>
                <ChevronDown
                  className="hidden size-3.5 text-[#7a867d] md:block"
                  aria-hidden="true"
                />
              </button>
              <div className="invisible absolute top-full right-0 mt-2 w-56 rounded-xl border border-[#d8ddd7] bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <p className="px-2 py-2 text-xs text-[#768078]">{user.email}</p>
                <p className="mx-2 mb-2 inline-flex rounded-full bg-[#e7f3e9] px-2 py-1 text-[10px] font-bold tracking-wide text-[#347346]">
                  {user.role}
                </p>
                <a
                  href={chatGPTSignOutPath("/")}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-[#f2f4f0]"
                >
                  Sign out
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#528260] uppercase">
                Sunday, 26 July
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Today’s top opportunities
              </h1>
              <p className="mt-2 text-sm text-[#6c776f]">
                Ranked across five marketplaces using opportunity score v1.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIntakeOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#173f2a] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,63,42,0.18)] hover:bg-[#205536]"
            >
              <PackagePlus className="size-4" aria-hidden="true" />
              Add product
            </button>
          </section>

          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Top score",
                `${Math.round(liveProducts[0]?.opportunityScore ?? 0)}`,
                TrendingUp,
              ],
              ["Opportunities", `${liveProducts.length}`, PackagePlus],
              ["Avg. commission", "₹79", Sparkles],
              ["Rising today", "18", Flame],
            ].map(([label, value, Icon], index) => {
              const MetricIcon = Icon as typeof TrendingUp;
              return (
                <article
                  key={label as string}
                  className="flex items-center gap-4 rounded-2xl border border-[#dce2db] bg-white p-4 shadow-[0_8px_24px_rgba(41,61,48,0.04)]"
                >
                  <span
                    className={`grid size-11 place-items-center rounded-xl ${
                      index === 0
                        ? "bg-[#dcf3e1] text-[#25733c]"
                        : "bg-[#f1f3ef] text-[#657168]"
                    }`}
                  >
                    <MetricIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xl font-semibold">{value as string}</p>
                    <p className="text-xs text-[#7b857e]">{label as string}</p>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="mt-7 flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {marketplaces.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMarketplace(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    marketplace === item
                      ? "bg-[#173f2a] text-white"
                      : "border border-[#d7ddd6] bg-white text-[#606b63] hover:border-[#7da489]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="relative sm:hidden">
              <Search
                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#7a867d]"
                aria-hidden="true"
              />
              <span className="sr-only">Search products</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="h-11 w-full rounded-xl border border-[#d8ddd7] bg-white pr-4 pl-10 text-sm outline-none focus:border-[#4b8c5c]"
              />
            </label>
          </section>

          {visibleProducts.length > 0 ? (
            <section className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleProducts.map((product, index) => {
                const saved = savedProducts.includes(product.id);
                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-[#dce2db] bg-white shadow-[0_8px_30px_rgba(45,65,52,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(45,65,52,0.1)]"
                  >
                    <div
                      className={`relative grid h-40 place-items-center bg-gradient-to-br ${accentClasses[product.accent]}`}
                    >
                      <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#4a574d] uppercase shadow-sm">
                        #{index + 1} today
                      </span>
                      <button
                        type="button"
                        aria-label={
                          saved
                            ? `Remove ${product.name} from saved products`
                            : `Save ${product.name}`
                        }
                        onClick={() => toggleSaved(product.id)}
                        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 shadow-sm"
                      >
                        <Bookmark
                          className={`size-4 ${saved ? "fill-[#256d3a] text-[#256d3a]" : "text-[#607066]"}`}
                        />
                      </button>
                      <ProductMedia
                        imageUrl={product.imageUrl}
                        alt={`${product.name} product image`}
                        imageClassName="size-full object-cover"
                        iconClassName="size-16 opacity-80 drop-shadow-sm"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#748078]">
                            <span>{product.marketplace}</span>
                            <span className="size-1 rounded-full bg-[#b1b8b2]" />
                            <span>{product.category}</span>
                          </div>
                          <h2 className="mt-2 line-clamp-2 font-semibold tracking-[-0.01em]">
                            {product.name}
                          </h2>
                        </div>
                        <div className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-[#d9efde] bg-[#eff9f1]">
                          <span className="text-lg font-bold text-[#276f3c]">
                            {Math.round(product.opportunityScore)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between border-b border-[#edf0ec] pb-4">
                        <div>
                          <p className="text-lg font-semibold">
                            {formatInr(product.price)}
                          </p>
                          <div className="flex gap-2 text-xs">
                            <span className="text-[#929a94] line-through">
                              {formatInr(product.originalPrice)}
                            </span>
                            <span className="font-bold text-[#d45c44]">
                              {product.discount}% off
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-xs font-semibold">
                            <Star
                              className="size-3.5 fill-[#f4b640] text-[#f4b640]"
                              aria-hidden="true"
                            />
                            {product.rating}
                            <span className="font-normal text-[#8a938c]">
                              ({(product.reviews / 1000).toFixed(1)}k)
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#7c867f]">
                            ~{formatInr(product.commissionEstimate)} commission
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="rounded-full bg-[#f0f3ef] px-2.5 py-1 text-[10px] font-bold text-[#637067]">
                          {product.status}
                        </span>
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#276f3c] hover:text-[#184d2a]"
                        >
                          Review opportunity
                          <ArrowUpRight
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="mt-5 rounded-2xl border border-dashed border-[#cfd7cf] bg-white px-6 py-16 text-center">
              <Search className="mx-auto size-7 text-[#8b958e]" />
              <h2 className="mt-4 font-semibold">No opportunities found</h2>
              <p className="mt-2 text-sm text-[#778179]">
                Try another marketplace or clear your search.
              </p>
            </section>
          )}
        </main>
      </div>
      <ProductIntakeDialog
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={(created) => {
          setLiveProducts((current) => [
            ...created.map(toDashboardProduct),
            ...current.filter(
              (product) =>
                !created.some((newProduct) => newProduct.id === product.id),
            ),
          ]);
        }}
      />
    </div>
  );
}
