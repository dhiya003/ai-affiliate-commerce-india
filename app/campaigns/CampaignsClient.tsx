"use client";

import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Copy,
  IndianRupee,
  LoaderCircle,
  Megaphone,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import type { CampaignSummary } from "@/lib/campaigns/types";

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

const channels = [
  "Instagram Reels",
  "YouTube Shorts",
  "Facebook",
  "WhatsApp",
  "Blog",
  "Other",
];

function dateTime(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function toIso(value: string) {
  return value ? new Date(`${value}T00:00:00+05:30`).toISOString() : null;
}

export function CampaignsClient({
  initialCampaigns,
}: {
  initialCampaigns: CampaignSummary[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    objective: "",
    channel: channels[0]!,
    startsAt: "",
    endsAt: "",
    budget: "",
    notes: "",
    templateName: "",
  });

  const visible = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          (!query ||
            `${campaign.name} ${campaign.objective} ${campaign.notes ?? ""}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!status || campaign.status === status) &&
          (!channel || campaign.channel === channel),
      ),
    [campaigns, channel, query, status],
  );

  async function refresh() {
    const response = await fetch("/api/campaigns");
    const payload = (await response.json()) as Envelope<CampaignSummary[]>;
    if (!response.ok || !payload.data) {
      throw new Error(payload.error?.message ?? "Campaign refresh failed.");
    }
    setCampaigns(payload.data);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy("create");
    setMessage(null);
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
          budget: form.budget ? Number(form.budget) : null,
          notes: form.notes || null,
          templateName: form.templateName || null,
          currency: "INR",
        }),
      });
      const payload = (await response.json()) as Envelope<CampaignSummary>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Campaign creation failed.");
      }
      setCampaigns((current) => [payload.data!, ...current]);
      setForm({
        name: "",
        objective: "",
        channel: channels[0]!,
        startsAt: "",
        endsAt: "",
        budget: "",
        notes: "",
        templateName: "",
      });
      setShowForm(false);
      setMessage("Campaign created as a draft.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Campaign creation failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function action(id: string, operation: "duplicate" | "archive") {
    setBusy(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: operation }),
      });
      const payload = (await response.json()) as Envelope<CampaignSummary>;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Campaign action failed.");
      }
      await refresh();
      setMessage(
        operation === "duplicate"
          ? "Campaign and its active promotion plan were duplicated."
          : "Campaign archived.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Campaign action failed.",
      );
    } finally {
      setBusy(null);
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
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#7fe099] uppercase">
              Phase 3 performance
            </p>
            <p className="mt-1 font-semibold">Campaign operations</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#49b968] px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="size-4" />
            New campaign
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section>
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            Promotion planning
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Plan, publish, and measure every promotion
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a61]">
            Campaigns connect products, generated content, creator accounts,
            publication records, tracked links, conversions, and commissions.
          </p>
        </section>

        {showForm ? (
          <form
            onSubmit={(event) => void create(event)}
            className="rounded-2xl border border-[#dce2db] bg-white p-5"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs font-bold">
                Name
                <input
                  required
                  minLength={3}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="field-control mt-2"
                  placeholder="Festive audio push"
                />
              </label>
              <label className="text-xs font-bold">
                Channel
                <select
                  value={form.channel}
                  onChange={(event) =>
                    setForm({ ...form, channel: event.target.value })
                  }
                  className="field-control mt-2"
                >
                  {channels.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Starts
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(event) =>
                    setForm({ ...form, startsAt: event.target.value })
                  }
                  className="field-control mt-2"
                />
              </label>
              <label className="text-xs font-bold">
                Ends
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(event) =>
                    setForm({ ...form, endsAt: event.target.value })
                  }
                  className="field-control mt-2"
                />
              </label>
              <label className="text-xs font-bold md:col-span-2">
                Objective
                <input
                  required
                  minLength={3}
                  value={form.objective}
                  onChange={(event) =>
                    setForm({ ...form, objective: event.target.value })
                  }
                  className="field-control mt-2"
                  placeholder="Drive verified affiliate conversions"
                />
              </label>
              <label className="text-xs font-bold">
                Budget (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budget}
                  onChange={(event) =>
                    setForm({ ...form, budget: event.target.value })
                  }
                  className="field-control mt-2"
                />
              </label>
              <label className="text-xs font-bold">
                Template label
                <input
                  value={form.templateName}
                  onChange={(event) =>
                    setForm({ ...form, templateName: event.target.value })
                  }
                  className="field-control mt-2"
                  placeholder="Festival launch"
                />
              </label>
              <label className="text-xs font-bold md:col-span-2 xl:col-span-4">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  className="field-control mt-2 min-h-24"
                  placeholder="Audience, offer, guardrails, and success criteria"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy === "create"}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#102c1e] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "create" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Megaphone className="size-4" />
              )}
              Create draft
            </button>
          </form>
        ) : null}

        <section className="grid gap-3 rounded-2xl border border-[#dce2db] bg-white p-4 md:grid-cols-3">
          <label className="relative">
            <span className="sr-only">Search campaigns</span>
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#849087]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaign, objective, or notes"
              className="field-control pl-10"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="field-control"
            aria-label="Campaign status"
          >
            <option value="">All statuses</option>
            {["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="field-control"
            aria-label="Campaign channel"
          >
            <option value="">All channels</option>
            {channels.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </section>

        {message ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-[#cfe5d4] bg-[#eff9f1] px-4 py-3 text-sm text-[#376443]"
          >
            {message}
          </p>
        ) : null}

        {visible.length ? (
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visible.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-2xl border border-[#dce2db] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-[#4c815b] uppercase">
                      {campaign.channel}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">
                      {campaign.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#edf2ed] px-2.5 py-1 text-[10px] font-bold">
                    {campaign.status}
                  </span>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-[#667168]">
                  {campaign.objective}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[#f4f6f3] p-3">
                    <CalendarDays className="size-4 text-[#4c815b]" />
                    <p className="mt-2 font-semibold">
                      {dateTime(campaign.startsAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f4f6f3] p-3">
                    <IndianRupee className="size-4 text-[#4c815b]" />
                    <p className="mt-2 font-semibold">
                      {campaign.budget == null
                        ? "No budget"
                        : new Intl.NumberFormat("en-IN").format(
                            campaign.budget,
                          )}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-[#738078]">
                  {campaign.promotionCount} promotions ·{" "}
                  {campaign.publishedCount} published
                </p>
                <div className="mt-5 flex gap-2 border-t border-[#e7ebe6] pt-4">
                  <button
                    type="button"
                    disabled={busy === campaign.id}
                    onClick={() => void action(campaign.id, "duplicate")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#dce2db] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    <Copy className="size-3.5" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={busy === campaign.id}
                    onClick={() => void action(campaign.id, "archive")}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#ead9d5] px-3 py-2 text-xs font-semibold text-[#8a4b3d] disabled:opacity-50"
                  >
                    <Archive className="size-3.5" />
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-[#cfd8cf] bg-white p-10 text-center">
            <Megaphone className="mx-auto size-8 text-[#6b8672]" />
            <h2 className="mt-4 text-lg font-semibold">No campaigns found</h2>
            <p className="mt-2 text-sm text-[#6b766e]">
              Create a campaign or clear the current filters.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
