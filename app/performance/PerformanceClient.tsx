"use client";

import {
  Activity,
  ArrowLeft,
  BadgeIndianRupee,
  CalendarRange,
  CircleAlert,
  LoaderCircle,
  MousePointerClick,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  PerformanceBreakdown,
  PerformanceDashboard,
} from "@/lib/performance/types";

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

const integer = new Intl.NumberFormat("en-IN");
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: PerformanceBreakdown[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce2db] bg-white">
      <div className="border-b border-[#e2e7e1] px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-[#f5f7f4] text-[#6c786f]">
              <tr>
                <th className="px-5 py-3 font-bold">Name</th>
                <th className="px-3 py-3 font-bold">Clicks</th>
                <th className="px-3 py-3 font-bold">Conversions</th>
                <th className="px-5 py-3 text-right font-bold">Commission</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row) => (
                <tr key={row.key} className="border-t border-[#edf0ec]">
                  <td className="max-w-56 truncate px-5 py-3.5 font-semibold">
                    {row.label}
                  </td>
                  <td className="px-3 py-3.5">{integer.format(row.clicks)}</td>
                  <td className="px-3 py-3.5">
                    {integer.format(row.conversions)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">
                    {money.format(row.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-8 text-sm text-[#6c786f]">
          No verified performance events in this period.
        </p>
      )}
    </section>
  );
}

export function PerformanceClient({
  initialDashboard,
}: {
  initialDashboard: PerformanceDashboard;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [from, setFrom] = useState(initialDashboard.range.from.slice(0, 10));
  const [to, setTo] = useState(initialDashboard.range.to.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDaily = useMemo(
    () =>
      Math.max(
        1,
        ...dashboard.daily.map((row) =>
          Math.max(row.clicks, row.conversions * 4),
        ),
      ),
    [dashboard.daily],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const fromIso = new Date(`${from}T00:00:00+05:30`).toISOString();
      const toIso = new Date(`${to}T23:59:59+05:30`).toISOString();
      const params = new URLSearchParams({ from: fromIso, to: toIso });
      const response = await fetch(`/api/performance?${params}`);
      const payload = (await response.json()) as Envelope<PerformanceDashboard>;
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Performance refresh failed.",
        );
      }
      setDashboard(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Performance refresh failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const metrics = [
    {
      label: "Verified clicks",
      value: integer.format(dashboard.summary.totalClicks),
      icon: MousePointerClick,
    },
    {
      label: "Conversions",
      value: integer.format(dashboard.summary.totalConversions),
      icon: ShoppingCart,
    },
    {
      label: "Approved commission",
      value: money.format(dashboard.summary.totalCommission),
      icon: BadgeIndianRupee,
    },
    {
      label: "Conversion rate",
      value: `${dashboard.summary.conversionRate.toFixed(2)}%`,
      icon: Activity,
    },
    {
      label: "Earnings per click",
      value: money.format(dashboard.summary.earningsPerClick),
      icon: BadgeIndianRupee,
    },
  ];

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
              Phase 3 analytics
            </p>
            <p className="mt-1 font-semibold">Affiliate performance</p>
          </div>
          <Link
            href="/campaigns"
            className="ml-auto rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
          >
            Campaigns
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
              Verified attribution only
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              What worked, and where earnings came from
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a61]">
              Bot and duplicate clicks are excluded. Conversion and commission
              totals include only accepted lifecycle states.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#dce2db] bg-white p-3">
            <label className="text-[11px] font-bold">
              From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                className="field-control mt-1 min-w-36"
              />
            </label>
            <label className="text-[11px] font-bold">
              To
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                className="field-control mt-1 min-w-36"
              />
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={() => void refresh()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#102c1e] px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Apply
            </button>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(({ label, value, icon: Icon }) => (
            <article
              key={label}
              className="rounded-2xl border border-[#dce2db] bg-white p-5"
            >
              <Icon className="size-5 text-[#3c9d59]" />
              <p className="mt-5 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-[#68736b]">{label}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Click-through rate is unproven</p>
              <p className="mt-1 text-xs leading-5">
                {dashboard.summary.clickThroughRateReason} The dashboard does
                not manufacture an impression denominator.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#dce2db] bg-white p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-5 text-[#3c9d59]" />
            <h2 className="font-semibold">Daily performance</h2>
          </div>
          {dashboard.daily.length ? (
            <div className="mt-6 flex min-h-56 items-end gap-2 overflow-x-auto pb-2">
              {dashboard.daily.map((row) => (
                <div
                  key={row.key}
                  className="flex min-w-12 flex-1 flex-col items-center"
                  title={`${row.label}: ${row.clicks} clicks, ${row.conversions} conversions, ${money.format(row.commission)}`}
                >
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <span
                      className="w-3 rounded-t bg-[#69c982]"
                      style={{
                        height: `${Math.max(3, (row.clicks / maxDaily) * 100)}%`,
                      }}
                    />
                    <span
                      className="w-3 rounded-t bg-[#173f2a]"
                      style={{
                        height: `${Math.max(3, ((row.conversions * 4) / maxDaily) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="mt-2 text-[9px] text-[#748077]">
                    {row.key.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#6c786f]">
              No verified daily events in this period.
            </p>
          )}
          <div className="mt-3 flex gap-4 text-[10px] text-[#647068]">
            <span>● Clicks</span>
            <span className="text-[#173f2a]">● Conversions ×4</span>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <BreakdownTable
            title="Marketplace performance"
            rows={dashboard.byMarketplace}
          />
          <BreakdownTable
            title="Campaign performance"
            rows={dashboard.byCampaign}
          />
        </div>
        <BreakdownTable
          title="Product performance"
          rows={dashboard.byProduct}
        />
      </div>
    </main>
  );
}
