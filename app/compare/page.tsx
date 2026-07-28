import { ArrowLeft, CircleAlert, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getLatestComplianceCheck } from "@/lib/compliance/repository";
import { getLatestContent } from "@/lib/content/repository";
import { getProduct } from "@/lib/products/repository";
import { listProductTrendSignals } from "@/lib/trends/repository";

export const dynamic = "force-dynamic";

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  return <ProtectedComparison searchParamsPromise={searchParams} />;
}

async function ProtectedComparison({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ ids?: string }>;
}) {
  const { ids: encodedIds = "" } = await searchParamsPromise;
  const ids = [
    ...new Set(
      encodedIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, 4);
  const returnTo = `/compare?ids=${encodeURIComponent(ids.join(","))}`;
  const user = await requireChatGPTUser(returnTo);
  const products = (
    await Promise.all(ids.map((id) => getProduct(id, user.email)))
  ).filter((product) => product !== null);
  const evidence = await Promise.all(
    products.map(async (product) => {
      const [content, trends, compliance] = await Promise.all([
        getLatestContent(product.id, user.email),
        listProductTrendSignals(product.id, user.email),
        getLatestComplianceCheck(product.id, user.email),
      ]);
      return { product, content, trends, compliance };
    }),
  );

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="border-b border-[#dce2db] bg-[#102c1e] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <Link
            href="/products"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to recommendations"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Decision support
            </p>
            <p className="mt-1 font-semibold">Product comparison</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Compare the evidence, not just the score
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68736b]">
          Opportunity, commission, trend, audience, content angle, and risk are
          shown side by side using only available evidence.
        </p>
        {evidence.length >= 2 ? (
          <section
            className="mt-8 grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${evidence.length}, minmax(250px, 1fr))`,
            }}
          >
            {evidence.map(({ product, content, trends, compliance }) => {
              const whyNow =
                trends.assessment.sevenDay.signalCount > 0
                  ? `${trends.assessment.direction.toLowerCase()} trend: ${Math.round(trends.assessment.sevenDay.score)}/100 over seven days.`
                  : "No verified trend signal yet; timing remains unproven.";
              const risks = [
                `${product.returnRisk.toLowerCase()} return risk`,
                product.stockStatus === "OUT_OF_STOCK"
                  ? "Currently unavailable"
                  : null,
                compliance?.exportBlocked
                  ? "Content export blocked by compliance"
                  : null,
                !product.affiliateUrl ? "Affiliate URL not recorded" : null,
              ].filter(Boolean);
              return (
                <article
                  key={product.id}
                  className="rounded-2xl border border-[#dce2db] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-wide text-[#4c815b] uppercase">
                        {product.marketplace}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold">
                        {product.name}
                      </h2>
                    </div>
                    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#e4f2e7] font-bold text-[#27683a]">
                      {Math.round(product.opportunityScore ?? 0)}
                    </span>
                  </div>
                  <dl className="mt-5 divide-y divide-[#edf0ec] text-xs">
                    {[
                      ["Price", formatInr(product.currentPrice)],
                      ["Rating", product.rating ?? "Unknown"],
                      ["Reviews", product.reviewCount.toLocaleString("en-IN")],
                      ["Commission", `${product.commissionRate ?? 0}%`],
                      ["Seller", product.sellerRating ?? "Unknown"],
                      ["Stock", product.stockStatus.replaceAll("_", " ")],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="flex justify-between gap-3 py-3"
                      >
                        <dt className="text-[#7b867e]">{label}</dt>
                        <dd className="text-right font-semibold">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 rounded-xl bg-[#f3f8f3] p-4">
                    <p className="flex items-center gap-2 text-xs font-bold">
                      <TrendingUp className="size-3.5" /> Why now?
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#657168]">
                      {whyNow}
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl bg-[#f7f5ec] p-4">
                    <p className="flex items-center gap-2 text-xs font-bold">
                      <Sparkles className="size-3.5" /> Audience and angle
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#657168]">
                      {content
                        ? `${content.content.targetAudiences.slice(0, 2).join(", ")}. ${content.content.reelHooks[0]}`
                        : "Generate content to establish an evidence-linked audience and angle."}
                    </p>
                  </div>
                  <div className="mt-3 rounded-xl bg-[#fff5f2] p-4">
                    <p className="flex items-center gap-2 text-xs font-bold">
                      <CircleAlert className="size-3.5" /> Risks
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#765f59]">
                      {risks.length
                        ? risks.join(" · ")
                        : "No material recorded risk."}
                    </p>
                  </div>
                  <Link
                    href={`/products/${encodeURIComponent(product.id)}`}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#173f2a] text-xs font-bold text-white"
                  >
                    Open full recommendation
                  </Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-[#cbd4ca] bg-white p-10 text-center">
            <h2 className="text-lg font-semibold">
              Select at least two products
            </h2>
            <p className="mt-2 text-sm text-[#78837b]">
              Use the comparison control in the recommendation catalogue.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex rounded-xl bg-[#173f2a] px-4 py-2.5 text-xs font-bold text-white"
            >
              Choose products
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
