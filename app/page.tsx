import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Target,
    title: "Find the right product",
    text: "One ranked view across India’s five biggest commerce marketplaces.",
  },
  {
    icon: BarChart3,
    title: "Know why it can win",
    text: "Explainable scores combine demand, margin, proof, price and risk.",
  },
  {
    icon: WandSparkles,
    title: "Go from pick to post",
    text: "Generate hooks, scripts, captions, hashtags and calls to action.",
  },
];

export default async function Home() {
  const user = await getChatGPTUser();
  const actionPath = user ? "/dashboard" : chatGPTSignInPath("/dashboard");

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f6f2] text-[#14211a]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#dfe3dc] py-5">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-[-0.02em]"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#163f2a] text-white shadow-[0_8px_24px_rgba(22,63,42,0.18)]">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg">Affinity India</span>
          </Link>
          <a
            href={actionPath}
            className="rounded-full border border-[#cdd5cc] bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:border-[#163f2a] hover:bg-[#f9fbf8]"
          >
            {user ? "Open dashboard" : "Sign in"}
          </a>
        </header>

        <section className="relative grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cbd8cd] bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-[0.16em] text-[#315d40] uppercase">
              <span className="size-2 rounded-full bg-[#4bc46b] shadow-[0_0_0_4px_rgba(75,196,107,0.13)]" />
              Built for affiliate commerce in India
            </div>
            <h1 className="max-w-[800px] text-[clamp(3.25rem,7.2vw,7.4rem)] leading-[0.89] font-semibold tracking-[-0.075em] text-balance">
              Find the product worth{" "}
              <span className="text-[#2d7d46]">posting today.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#526057] sm:text-xl">
              Rank opportunities across Amazon, Flipkart, Meesho, Myntra and
              AJIO—then turn your best pick into affiliate-ready content in
              minutes.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={actionPath}
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#163f2a] px-6 py-4 font-semibold text-white shadow-[0_14px_34px_rgba(22,63,42,0.23)] transition hover:-translate-y-0.5 hover:bg-[#1c5134]"
              >
                {user ? "See today’s opportunities" : "Sign in to get started"}
                <ArrowRight
                  className="size-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </a>
              <span className="inline-flex items-center justify-center gap-2 px-4 py-4 text-sm text-[#667269]">
                <CheckCircle2
                  className="size-4 text-[#2d7d46]"
                  aria-hidden="true"
                />
                Explainable scores, human approval
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[610px] lg:ml-auto">
            <div className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,rgba(106,183,116,0.18),transparent_68%)]" />
            <div className="relative rotate-[1.5deg] rounded-[2rem] border border-[#d7ddd5] bg-white p-4 shadow-[0_35px_90px_rgba(44,66,51,0.16)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#7d887f] uppercase">
                    Today’s #1 opportunity
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    SwiftCut Handy Chopper
                  </h2>
                </div>
                <div className="grid size-16 place-items-center rounded-full bg-[#e7f5e9] text-center">
                  <span className="text-xl font-bold text-[#246b3b]">88</span>
                  <span className="-mt-2 text-[9px] font-bold tracking-wider text-[#588364] uppercase">
                    score
                  </span>
                </div>
              </div>
              <div className="grid aspect-[1.7] place-items-center overflow-hidden rounded-[1.35rem] bg-[linear-gradient(145deg,#f3dca4,#ee9f58)]">
                <div className="relative grid size-36 place-items-center rounded-[2rem] border-8 border-white/60 bg-white/45 shadow-xl backdrop-blur">
                  <div className="h-5 w-24 rounded-full bg-[#223d2b]" />
                  <div className="mt-2 size-20 rounded-b-[2rem] border-4 border-[#223d2b] bg-white/55" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["₹299", "Current price"],
                  ["57%", "Discount"],
                  ["₹26.91", "Est. commission"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-[#f5f7f3] p-3.5">
                    <p className="font-semibold">{value}</p>
                    <p className="mt-1 text-[11px] text-[#768078]">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e2e7e0] p-3 text-xs text-[#58655c]">
                <Sparkles
                  className="size-4 text-[#2d7d46]"
                  aria-hidden="true"
                />
                Strong trend, accessible price and 18.9k customer reviews
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-t-[1.75rem] border border-b-0 border-[#dfe3dc] bg-[#dfe3dc] sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bg-[#fafbf8] p-6 lg:p-8">
              <Icon className="size-5 text-[#2d7d46]" aria-hidden="true" />
              <h2 className="mt-5 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#69746c]">{text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
