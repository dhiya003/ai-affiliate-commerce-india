"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  BadgeAlert,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  POLICY_KINDS,
  POLICY_STATUSES,
  type PolicyKind,
  type PolicyKnowledgeBase,
  type PolicyRecord,
  type PolicyStatus,
} from "@/lib/policies/types";

interface PolicyKnowledgeBaseClientProps {
  initialKnowledgeBase: PolicyKnowledgeBase;
  role: "ADMIN" | "USER";
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { message: string };
}

const marketplaces = ["All", "Amazon", "Flipkart", "Meesho", "Myntra", "AJIO"];

const kindLabels: Record<PolicyKind, string> = {
  MARKETPLACE_RULE: "Marketplace rules",
  COMMISSION_RULE: "Commission rules",
  CONTENT_POLICY: "Content policies",
  AFFILIATE_DISCLOSURE: "Disclosures",
  PROHIBITED_PRACTICE: "Prohibited practices",
};

const statusLabels: Record<PolicyStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  NEEDS_REVIEW: "Needs review",
  RETIRED: "Retired",
};

const statusClasses: Record<PolicyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  NEEDS_REVIEW: "bg-amber-100 text-amber-800",
  RETIRED: "bg-stone-200 text-stone-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function policyDetail(policy: PolicyRecord) {
  if (policy.kind === "COMMISSION_RULE") {
    const rate =
      policy.rateMin == null
        ? "Dynamic rate"
        : policy.rateMin === policy.rateMax
          ? `${policy.rateMin}%`
          : `${policy.rateMin}%–${policy.rateMax}%`;
    return `${policy.category}: ${rate}`;
  }
  if (policy.kind === "AFFILIATE_DISCLOSURE") {
    return policy.disclosureText;
  }
  if (policy.kind === "PROHIBITED_PRACTICE") {
    return `${policy.severity} severity`;
  }
  return policy.channel ?? policy.ruleType;
}

export function PolicyKnowledgeBaseClient({
  initialKnowledgeBase,
  role,
}: PolicyKnowledgeBaseClientProps) {
  const [knowledgeBase, setKnowledgeBase] = useState(initialKnowledgeBase);
  const [marketplace, setMarketplace] = useState("All");
  const [kind, setKind] = useState<PolicyKind | "All">("All");
  const [status, setStatus] = useState<PolicyStatus | "All">("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visiblePolicies = useMemo(
    () =>
      knowledgeBase.policies.filter(
        (policy) =>
          (marketplace === "All" || policy.marketplace === marketplace) &&
          (kind === "All" || policy.kind === kind) &&
          (status === "All" || policy.status === status),
      ),
    [kind, knowledgeBase.policies, marketplace, status],
  );

  async function reviewPolicy(policy: PolicyRecord, nextStatus: PolicyStatus) {
    setUpdatingId(policy.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/policies/${policy.kind}/${encodeURIComponent(policy.id)}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const payload = (await response.json()) as ApiEnvelope<PolicyRecord>;
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Policy could not be updated.",
        );
      }
      setKnowledgeBase((current) => {
        const policies = current.policies.map((item) =>
          item.id === policy.id ? payload.data! : item,
        );
        return {
          ...current,
          policies,
          summary: {
            ...current.summary,
            active: policies.filter((item) => item.status === "ACTIVE").length,
            needsReview: policies.filter(
              (item) => item.status === "NEEDS_REVIEW",
            ).length,
          },
        };
      });
      setMessage(`${policy.title} is now ${statusLabels[nextStatus]}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Policy could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#19231d]">
      <header className="border-b border-[#dce2db] bg-[#102c1e] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <Link
            href="/dashboard"
            className="grid size-10 place-items-center rounded-xl bg-white/10"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Phase 2 intelligence
            </p>
            <p className="mt-1 font-semibold">Marketplace policy centre</p>
          </div>
          <span className="ml-auto rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold tracking-wide">
            {role}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section className="max-w-3xl">
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            Source-backed policy knowledge
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Know the rule before publishing the link.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#68746b]">
            Review dated marketplace requirements, commission schedules,
            disclosures, and blocked practices. “Needs review” means the source
            or creator route must be confirmed before promotion.
          </p>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Policy records", knowledgeBase.summary.total, BookOpenCheck],
            ["Active", knowledgeBase.summary.active, CheckCircle2],
            ["Needs review", knowledgeBase.summary.needsReview, Clock3],
            [
              "Blocking practices",
              knowledgeBase.summary.blockingPractices,
              ShieldAlert,
            ],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof BookOpenCheck;
            return (
              <article
                key={label as string}
                className="flex items-center gap-4 rounded-2xl border border-[#dce2db] bg-white p-4"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[#e6f2e8] text-[#347647]">
                  <MetricIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xl font-semibold">{value as number}</p>
                  <p className="text-xs text-[#78837b]">{label as string}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-7 grid gap-3 rounded-2xl border border-[#dce2db] bg-white p-4 md:grid-cols-3">
          <select
            value={marketplace}
            onChange={(event) => setMarketplace(event.target.value)}
            className="field-control"
            aria-label="Filter policies by marketplace"
          >
            {marketplaces.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as PolicyKind | "All")
            }
            className="field-control"
            aria-label="Filter policies by type"
          >
            <option>All</option>
            {POLICY_KINDS.map((item) => (
              <option key={item} value={item}>
                {kindLabels[item]}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as PolicyStatus | "All")
            }
            className="field-control"
            aria-label="Filter policies by status"
          >
            <option>All</option>
            {POLICY_STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </section>

        {message ? (
          <p
            className="mt-4 rounded-xl border border-[#d9e2d9] bg-white px-4 py-3 text-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {visiblePolicies.map((policy) => (
            <article
              key={`${policy.kind}:${policy.id}`}
              className="flex flex-col rounded-2xl border border-[#dce2db] bg-white p-5 shadow-[0_8px_24px_rgba(41,61,48,0.04)]"
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-wide uppercase">
                <span className="rounded-full bg-[#edf1ec] px-2.5 py-1 text-[#5e6d63]">
                  {policy.marketplace}
                </span>
                <span className="rounded-full bg-[#e7f1e8] px-2.5 py-1 text-[#347346]">
                  {kindLabels[policy.kind]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 ${statusClasses[policy.status]}`}
                >
                  {statusLabels[policy.status]}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em]">
                {policy.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#69756c]">
                {policy.summary}
              </p>
              {policyDetail(policy) ? (
                <div className="mt-4 rounded-xl bg-[#f4f6f2] p-3 text-xs leading-5 text-[#465249]">
                  {policyDetail(policy)}
                </div>
              ) : null}
              {policy.placement ? (
                <p className="mt-3 text-xs leading-5 text-[#78837b]">
                  Placement: {policy.placement}
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-xs">
                <span className="text-[#7d877f]">
                  Effective {formatDate(policy.effectiveAt)}
                </span>
                <a
                  href={policy.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#2f7042]"
                >
                  Official source
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              </div>
              {role === "ADMIN" ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf0ec] pt-4">
                  <button
                    type="button"
                    disabled={
                      updatingId === policy.id || policy.status === "ACTIVE"
                    }
                    onClick={() => void reviewPolicy(policy, "ACTIVE")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#173f2a] px-3 text-[11px] font-bold text-white disabled:opacity-40"
                  >
                    {updatingId === policy.id ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <FileCheck2 className="size-3" />
                    )}
                    Mark active
                  </button>
                  <button
                    type="button"
                    disabled={
                      updatingId === policy.id ||
                      policy.status === "NEEDS_REVIEW"
                    }
                    onClick={() => void reviewPolicy(policy, "NEEDS_REVIEW")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8ddd7] px-3 text-[11px] font-bold disabled:opacity-40"
                  >
                    <RefreshCw className="size-3" />
                    Needs review
                  </button>
                  <button
                    type="button"
                    disabled={
                      updatingId === policy.id || policy.status === "RETIRED"
                    }
                    onClick={() => void reviewPolicy(policy, "RETIRED")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e6c9c2] px-3 text-[11px] font-bold text-[#944a3d] disabled:opacity-40"
                  >
                    Retire
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </section>

        {visiblePolicies.length === 0 ? (
          <section className="mt-5 rounded-2xl border border-dashed border-[#cbd4ca] bg-white p-12 text-center">
            <BadgeAlert className="mx-auto size-8 text-[#7c9a83]" />
            <h2 className="mt-3 font-semibold">No matching policy records</h2>
            <p className="mt-1 text-sm text-[#78837b]">
              Adjust the marketplace, type, or review-status filter.
            </p>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="flex items-center gap-2">
            <History className="size-5 text-[#347647]" aria-hidden="true" />
            <h2 className="text-xl font-semibold">Platform update history</h2>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#dce2db] bg-white">
            {knowledgeBase.updates.map((update) => (
              <article
                key={update.id}
                className="border-b border-[#edf0ec] p-4 last:border-0 sm:flex sm:items-start sm:justify-between sm:gap-6"
              >
                <div>
                  <p className="text-xs font-bold text-[#39764a]">
                    {update.marketplace} ·{" "}
                    {update.changeType.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#647067]">
                    {update.summary}
                  </p>
                </div>
                <div className="mt-2 flex shrink-0 items-center gap-3 sm:mt-0">
                  <span className="text-xs text-[#7d877f]">
                    {formatDate(update.detectedAt)}
                  </span>
                  <a
                    href={update.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open source for ${update.summary}`}
                    className="text-[#347647]"
                  >
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
