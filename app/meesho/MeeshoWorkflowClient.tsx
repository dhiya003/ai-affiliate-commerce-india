"use client";

import { ArrowLeft, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { MeeshoCreatorWorkflow } from "@/lib/meesho/workflow-schema";

interface Summary {
  total: number;
  published: number;
  autoDmEnrolled: number;
  awaitingHumanAction: number;
  retryScheduled: number;
  failed: number;
  byStatus: Record<string, number>;
}

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

async function data<T>(response: Response) {
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "The request failed.");
  }
  return payload.data;
}

function statusClass(status: string) {
  if (status === "PUBLISHED" || status === "AUTODM_ENROLLED")
    return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "bg-red-50 text-red-700";
  if (status === "RETRY_SCHEDULED") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

export function MeeshoWorkflowClient({
  initialWorkflows,
  initialSummary,
}: {
  initialWorkflows: MeeshoCreatorWorkflow[];
  initialSummary: Summary;
}) {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [summary, setSummary] = useState(initialSummary);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const result = await data<{
      workflows: MeeshoCreatorWorkflow[];
      summary: Summary;
    }>(await fetch("/api/meesho/workflows"));
    setWorkflows(result.workflows);
    setSummary(result.summary);
  }

  async function importWishlistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("import");
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await data(
        await fetch("/api/meesho/workflows", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            productUrl: form.get("productUrl"),
            title: form.get("title"),
            imageUrl: form.get("imageUrl"),
            category: form.get("category"),
            price: Number(form.get("price")),
            originalPrice: null,
            supplierName: form.get("supplierName") || null,
            observedAt: new Date().toISOString(),
          }),
        }),
      );
      event.currentTarget.reset();
      await refresh();
      setNotice(
        "Wishlist product imported. Verify it and record the official Creator Club link next.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function action(
    workflow: MeeshoCreatorWorkflow,
    body: Record<string, unknown>,
  ) {
    setBusy(`${workflow.id}:${body.action}`);
    setError(null);
    try {
      const updated = await data<MeeshoCreatorWorkflow>(
        await fetch(`/api/meesho/workflows/${workflow.id}/actions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      setWorkflows((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await refresh();
      setNotice(`Workflow moved to ${updated.status}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="border-b border-[#dce2db] bg-[#102c1e] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-4 px-5 py-4">
          <Link
            href="/dashboard"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Creator operations
            </p>
            <h1 className="mt-1 font-semibold">Meesho wishlist to AutoDM</h1>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-7">
        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Total", summary.total],
            ["Published", summary.published],
            ["AutoDM", summary.autoDmEnrolled],
            ["Human action", summary.awaitingHumanAction],
            ["Retry", summary.retryScheduled],
            ["Failed", summary.failed],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#dce2db] bg-white p-4"
            >
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>
        <form
          onSubmit={importWishlistItem}
          className="grid gap-3 rounded-3xl border border-[#dce2db] bg-white p-5 md:grid-cols-3"
        >
          <h2 className="text-lg font-bold md:col-span-3">
            Import a Meesho wishlist product
          </h2>
          {[
            ["productUrl", "Product URL", "url"],
            ["title", "Product title", "text"],
            ["imageUrl", "Verified image URL", "url"],
            ["category", "Category", "text"],
            ["price", "Current price", "number"],
            ["supplierName", "Supplier", "text"],
          ].map(([name, label, type]) => (
            <label key={name} className="text-sm font-medium">
              {label}
              <input
                required={name !== "supplierName"}
                name={name}
                type={type}
                step={type === "number" ? "0.01" : undefined}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          ))}
          <button
            disabled={busy === "import"}
            className="rounded-xl bg-[#173f2b] px-4 py-3 font-semibold text-white md:col-span-3"
          >
            {busy === "import" ? "Importing…" : "Import wishlist product"}
          </button>
        </form>
        {notice ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <section className="space-y-4">
          {workflows.map((workflow) => {
            const pending = busy?.startsWith(workflow.id);
            return (
              <article
                key={workflow.id}
                className="rounded-3xl border border-[#dce2db] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{workflow.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      ₹{workflow.price.toLocaleString("en-IN")} ·{" "}
                      {workflow.category}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(workflow.status)}`}
                  >
                    {workflow.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {workflow.status === "IMPORTED" ? (
                    <button
                      onClick={() => {
                        const affiliateUrl = window.prompt(
                          "Paste the official Creator Club affiliate link",
                        );
                        if (affiliateUrl)
                          void action(workflow, {
                            action: "record-affiliate-link",
                            affiliateUrl,
                            factsVerified: true,
                          });
                      }}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                    >
                      Record verified affiliate link
                    </button>
                  ) : null}
                  {workflow.status === "LINK_READY" ? (
                    <button
                      onClick={() =>
                        void action(workflow, {
                          action: "render-creative",
                          caption: `${workflow.title}. Comment LINK and I’ll send the product details to your DM. Price and availability may change on Meesho. #ad`,
                          hashtags: ["#MeeshoFinds", "#VerveProducts"],
                        })
                      }
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                    >
                      Render 9:16 creative
                    </button>
                  ) : null}
                  {workflow.status === "CREATIVE_READY" ? (
                    <button
                      onClick={() =>
                        void action(workflow, { action: "approve" })
                      }
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                    >
                      Approve creative
                    </button>
                  ) : null}
                  {workflow.status === "APPROVED" ? (
                    <button
                      onClick={() =>
                        void action(workflow, { action: "publish" })
                      }
                      className="rounded-xl bg-[#d54278] px-3 py-2 text-sm text-white"
                    >
                      Publish to Instagram
                    </button>
                  ) : null}
                  {workflow.status === "RETRY_SCHEDULED" ||
                  workflow.status === "FAILED" ? (
                    <button
                      onClick={() =>
                        void action(workflow, { action: "retry-publish" })
                      }
                      className="flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-sm text-white"
                    >
                      <RefreshCw className="size-4" />
                      Retry publish
                    </button>
                  ) : null}
                  {workflow.status === "PUBLISHED" ? (
                    <>
                      <a
                        href="https://affiliate.meesho.com/auto-dm-post-linking"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-[#d54278] px-3 py-2 text-sm text-white"
                      >
                        Open Meesho AutoDM <ExternalLink className="size-4" />
                      </a>
                      <button
                        onClick={() =>
                          void action(workflow, {
                            action: "confirm-autodm",
                            triggerWords: ["LINK", "PRICE", "DETAILS", "DM"],
                          })
                        }
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                      >
                        Confirm AutoDM enrollment
                      </button>
                    </>
                  ) : null}
                  {workflow.instagramPermalink ? (
                    <a
                      href={workflow.instagramPermalink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                    >
                      View post <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {pending ? (
                    <LoaderCircle className="size-5 animate-spin self-center" />
                  ) : null}
                </div>
                {workflow.lastErrorMessage ? (
                  <p className="mt-3 text-sm text-red-600">
                    {workflow.lastErrorCode}: {workflow.lastErrorMessage}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
