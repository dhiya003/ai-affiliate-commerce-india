import { ArrowLeft, Bookmark, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { ProductMedia } from "@/components/products/ProductMedia";
import { listSavedProducts } from "@/lib/saved-products/repository";

export const dynamic = "force-dynamic";

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SavedProductsPage() {
  const user = await requireChatGPTUser("/saved");
  const saved = await listSavedProducts(user.email);

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="border-b border-[#dce2db] bg-[#102c1e] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <Link
            href="/products"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to product catalogue"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Recommendation workspace
            </p>
            <p className="mt-1 font-semibold">Saved products</p>
          </div>
          <span className="ml-auto rounded-full border border-white/15 px-3 py-1.5 text-xs">
            {saved.length} saved
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Products worth another look
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68736b]">
          Your shortlist is stored securely against your signed-in account.
        </p>
        {saved.length ? (
          <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {saved.map(({ product, savedAt }) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-[#dce2db] bg-white"
              >
                <div className="grid h-36 place-items-center overflow-hidden bg-[linear-gradient(145deg,#dff1e3,#fff4d5)]">
                  <ProductMedia
                    imageUrl={product.imageUrl}
                    alt={`${product.name} product image`}
                    imageClassName="size-full object-cover"
                    iconClassName="size-14 text-[#26723d]"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between text-[10px] font-bold tracking-wide uppercase">
                    <span>{product.marketplace}</span>
                    <span>{Math.round(product.opportunityScore ?? 0)}/100</span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-lg font-semibold">
                    {product.name}
                  </h2>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {formatInr(product.currentPrice)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#68736b]">
                      <Star className="size-3 fill-[#f4b640] text-[#f4b640]" />
                      {product.rating ?? "—"}
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] text-[#879087]">
                    Saved {new Date(savedAt).toLocaleDateString("en-IN")}
                  </p>
                  <Link
                    href={`/products/${encodeURIComponent(product.id)}`}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#173f2a] text-xs font-bold text-white"
                  >
                    Open recommendation
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-7 grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#cbd4ca] bg-white p-8 text-center">
            <div>
              <Bookmark className="mx-auto size-10 text-[#7c9a83]" />
              <h2 className="mt-3 text-lg font-semibold">
                No saved products yet
              </h2>
              <p className="mt-1 text-sm text-[#78837b]">
                Save promising products from the recommendation catalogue.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-flex rounded-xl bg-[#173f2a] px-4 py-2.5 text-xs font-bold text-white"
              >
                Explore recommendations
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
