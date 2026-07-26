"use client";

import { Check, Copy, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ContentBundle, GeneratedContent } from "@/lib/content/schema";

interface ContentStudioProps {
  productId: string;
  initialContent: GeneratedContent | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

type ContentSection = {
  key: keyof ContentBundle;
  label: string;
  value: string;
  wide?: boolean;
};

function listText(values: string[]): string {
  return values.map((value, index) => `${index + 1}. ${value}`).join("\n");
}

function sections(bundle: ContentBundle): ContentSection[] {
  return [
    { key: "summary", label: "Product summary", value: bundle.summary },
    {
      key: "whyPromote",
      label: "Why promote this?",
      value: bundle.whyPromote,
    },
    {
      key: "targetAudiences",
      label: "Target audiences",
      value: listText(bundle.targetAudiences),
    },
    {
      key: "reelHooks",
      label: "Three reel hooks",
      value: listText(bundle.reelHooks),
    },
    {
      key: "reelScript30",
      label: "30-second reel script",
      value: bundle.reelScript30,
      wide: true,
    },
    {
      key: "reelScript60",
      label: "60-second reel script",
      value: bundle.reelScript60,
      wide: true,
    },
    {
      key: "caption",
      label: "Social caption",
      value: bundle.caption,
      wide: true,
    },
    {
      key: "hashtags",
      label: "Hashtags",
      value: bundle.hashtags.join(" "),
      wide: true,
    },
    { key: "ctas", label: "CTA options", value: listText(bundle.ctas) },
    {
      key: "thumbnailTexts",
      label: "Thumbnail text",
      value: listText(bundle.thumbnailTexts),
    },
    { key: "pros", label: "Product pros", value: listText(bundle.pros) },
    {
      key: "cautions",
      label: "Product cautions",
      value: listText(bundle.cautions),
    },
    {
      key: "affiliateDisclosure",
      label: "Affiliate disclosure",
      value: bundle.affiliateDisclosure,
      wide: true,
    },
  ];
}

export function ContentStudio({
  productId,
  initialContent,
}: ContentStudioProps) {
  const [generated, setGenerated] = useState(initialContent);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/content`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiEnvelope<GeneratedContent>;
      if (!response.ok || !result.data) {
        throw new Error(
          result.error?.message ?? "Content could not be generated.",
        );
      }
      setGenerated(result.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Content could not be generated.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1_500);
  }

  return (
    <section className="rounded-3xl border border-[#dce2db] bg-[#173f2a] p-6 text-white shadow-[0_18px_55px_rgba(23,63,42,0.16)] sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[#bce5c5]">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#a9d7b4] uppercase">
              Affiliate Content Studio
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
              {generated
                ? "Your content bundle is ready"
                : "Create the campaign"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c6d8ca]">
              Generate scripts, caption, hashtags, calls to action and safe
              purchasing context from the verified product facts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f5c94e] px-4 text-sm font-bold text-[#25301f] disabled:cursor-wait disabled:opacity-70"
        >
          {generating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : generated ? (
            <RefreshCw className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating
            ? "Generating…"
            : generated
              ? "Regenerate bundle"
              : "Generate content"}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[#f0b8aa]/40 bg-[#7d3127]/35 p-4 text-sm text-[#ffe0d8]"
        >
          {error}
        </div>
      ) : null}

      {generated ? (
        <>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {sections(generated.content).map((section) => (
              <article
                key={section.key}
                className={`rounded-2xl border border-white/10 bg-white/[0.075] p-4 ${
                  section.wide ? "md:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xs font-bold tracking-wide text-[#b8d9c0] uppercase">
                    {section.label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => copy(section.key, section.value)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-[#d9e8dc] hover:bg-white/10"
                  >
                    {copied === section.key ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copied === section.key ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 whitespace-pre-line text-[#f2f7f3]">
                  {section.value}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-[#9eb9a5]">
            Saved {new Date(generated.createdAt).toLocaleString("en-IN")} ·{" "}
            {generated.provider === "openai"
              ? `OpenAI ${generated.providerModel}`
              : "Built-in launch generator"}{" "}
            · Prompt {generated.promptVersion}
          </p>
        </>
      ) : (
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            "3 hooks + 30s and 60s scripts",
            "Caption + hashtags + CTAs",
            "Audience + pros + cautions",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-[#d6e5d9]"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
