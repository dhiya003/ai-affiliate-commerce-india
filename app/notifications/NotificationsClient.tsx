"use client";

import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Download,
  FileText,
  LoaderCircle,
  Mail,
  RefreshCw,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { NOTIFICATION_TYPES } from "@/lib/notifications/schema";
import type {
  GeneratedReport,
  Notification,
  NotificationPreference,
} from "@/lib/notifications/types";

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

const defaultReportTo = new Date();
const defaultReportFrom = new Date(
  defaultReportTo.getTime() - 30 * 24 * 60 * 60_000,
);
const defaultReportDates = {
  from: defaultReportFrom.toISOString().slice(0, 10),
  to: defaultReportTo.toISOString().slice(0, 10),
};

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? "The request failed.");
  }
  return payload.data;
}

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function severityClass(severity: Notification["severity"]) {
  if (severity === "CRITICAL") return "border-red-200 bg-red-50";
  if (severity === "WARNING") return "border-amber-200 bg-amber-50";
  if (severity === "SUCCESS") return "border-emerald-200 bg-emerald-50";
  return "border-blue-100 bg-blue-50/60";
}

export function NotificationsClient({
  initialNotifications,
  initialPreference,
  initialReports,
}: {
  initialNotifications: Notification[];
  initialPreference: NotificationPreference;
  initialReports: GeneratedReport[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [preference, setPreference] = useState(initialPreference);
  const [reports, setReports] = useState(initialReports);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unread = useMemo(
    () => notifications.filter(({ readAt }) => !readAt).length,
    [notifications],
  );

  function begin(key: string) {
    setBusy(key);
    setMessage(null);
    setError(null);
  }

  function fail(caught: unknown) {
    setError(caught instanceof Error ? caught.message : "The request failed.");
    setBusy(null);
  }

  async function refreshNotifications() {
    const fresh = await readResponse<Notification[]>(
      await fetch("/api/notifications"),
    );
    setNotifications(fresh);
  }

  async function scan() {
    begin("scan");
    try {
      const result = await readResponse<{ evaluated: number; created: number }>(
        await fetch("/api/notifications/scan", { method: "POST" }),
      );
      await refreshNotifications();
      setMessage(
        `Checked ${result.evaluated} alert candidates and created ${result.created} new notifications.`,
      );
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function toggleRead(notification: Notification) {
    begin(`read:${notification.id}`);
    try {
      await readResponse(
        await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: notification.readAt ? "unread" : "read",
          }),
        }),
      );
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt: notification.readAt ? null : new Date().toISOString(),
              }
            : item,
        ),
      );
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function markAllRead() {
    begin("read-all");
    try {
      await readResponse(
        await fetch("/api/notifications/read-all", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "read-all" }),
        }),
      );
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? now })),
      );
      setMessage("All notifications marked as read.");
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("preferences");
    try {
      setPreference(
        await readResponse<NotificationPreference>(
          await fetch("/api/notifications/preferences", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(preference),
          }),
        ),
      );
      setMessage("Notification preferences saved.");
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("report");
    const form = new FormData(event.currentTarget);
    const to = new Date(String(form.get("to")) + "T23:59:59.999Z");
    const from = new Date(String(form.get("from")) + "T00:00:00.000Z");
    try {
      const report = await readResponse<GeneratedReport>(
        await fetch("/api/reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: form.get("type"),
            format: form.get("format"),
            from: from.toISOString(),
            to: to.toISOString(),
          }),
        }),
      );
      setReports((current) => [
        report,
        ...current.filter(({ id }) => id !== report.id),
      ]);
      setMessage("Report generated and ready to download.");
      setBusy(null);
    } catch (caught) {
      fail(caught);
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
              Phase 3 intelligence
            </p>
            <p className="mt-1 font-semibold">Notifications & reports</p>
          </div>
          <span className="ml-auto rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
            {unread} unread
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-8 sm:px-7 lg:px-10">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
              Act on change
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Signals that need your attention
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#5d6a61]">
              Trend, price, stock, policy, compliance, campaign, and risk alerts
              share one auditable inbox.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              disabled={!unread || busy !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d5ddd5] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <CheckCheck className="size-4" />
              Mark all read
            </button>
            <button
              onClick={scan}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173f2a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "scan" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Check now
            </button>
          </div>
        </section>

        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-5 ${severityClass(notification.severity)} ${notification.readAt ? "opacity-70" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{notification.title}</h2>
                      <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold">
                        {label(notification.type)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#526057]">
                      {notification.body}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#66736a]">
                      <span>
                        {new Date(notification.createdAt).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                      {notification.actionUrl ? (
                        <Link
                          href={notification.actionUrl}
                          className="font-semibold text-[#22643a]"
                        >
                          Review
                        </Link>
                      ) : null}
                      <button
                        onClick={() => toggleRead(notification)}
                        disabled={busy !== null}
                        className="font-semibold text-[#22643a]"
                      >
                        Mark {notification.readAt ? "unread" : "read"}
                      </button>
                      {notification.delivery.email ? (
                        <span>
                          Email: {notification.delivery.email.toLowerCase()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!notifications.length ? (
              <div className="rounded-2xl border border-dashed border-[#ccd6cc] bg-white p-10 text-center">
                <Bell className="mx-auto size-7 text-[#6f7d73]" />
                <p className="mt-3 font-semibold">No active notifications</p>
                <p className="mt-1 text-sm text-[#6f7d73]">
                  Run a check to evaluate current product and campaign signals.
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <form
              onSubmit={savePreferences}
              className="rounded-2xl border border-[#dce2db] bg-white p-5"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <Settings2 className="size-4" />
                Preferences
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={preference.inAppEnabled}
                    onChange={(event) =>
                      setPreference({
                        ...preference,
                        inAppEnabled: event.target.checked,
                      })
                    }
                  />
                  In-app notifications
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={preference.emailEnabled}
                    onChange={(event) =>
                      setPreference({
                        ...preference,
                        emailEnabled: event.target.checked,
                      })
                    }
                  />
                  <Mail className="size-4" />
                  Email notifications
                </label>
                <label className="text-xs font-semibold">
                  Digest frequency
                  <select
                    value={preference.digestFrequency}
                    onChange={(event) =>
                      setPreference({
                        ...preference,
                        digestFrequency: event.target
                          .value as NotificationPreference["digestFrequency"],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                  >
                    <option>NONE</option>
                    <option>DAILY</option>
                    <option>WEEKLY</option>
                    <option>MONTHLY</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold">
                    Quiet from
                    <input
                      type="time"
                      value={preference.quietHoursStart ?? ""}
                      onChange={(event) =>
                        setPreference({
                          ...preference,
                          quietHoursStart: event.target.value || null,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Quiet until
                    <input
                      type="time"
                      value={preference.quietHoursEnd ?? ""}
                      onChange={(event) =>
                        setPreference({
                          ...preference,
                          quietHoursEnd: event.target.value || null,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Alert types ({preference.enabledTypes.length})
                </summary>
                <div className="mt-3 grid gap-2">
                  {NOTIFICATION_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={preference.enabledTypes.includes(type)}
                        onChange={(event) =>
                          setPreference({
                            ...preference,
                            enabledTypes: event.target.checked
                              ? [...new Set([...preference.enabledTypes, type])]
                              : preference.enabledTypes.filter(
                                  (item) => item !== type,
                                ),
                          })
                        }
                      />
                      {label(type)}
                    </label>
                  ))}
                </div>
              </details>
              <button
                disabled={busy !== null}
                className="mt-5 w-full rounded-xl bg-[#173f2a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save preferences
              </button>
            </form>

            <form
              onSubmit={generateReport}
              className="rounded-2xl border border-[#dce2db] bg-white p-5"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <FileText className="size-4" />
                Generate report
              </h2>
              <div className="mt-4 grid gap-3">
                <select
                  name="type"
                  className="rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                >
                  <option value="DAILY_OPPORTUNITY">
                    Daily opportunity summary
                  </option>
                  <option value="WEEKLY_PERFORMANCE">
                    Weekly performance summary
                  </option>
                  <option value="MONTHLY_EARNINGS">
                    Monthly earnings summary
                  </option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label="Report start"
                    name="from"
                    type="date"
                    defaultValue={defaultReportDates.from}
                    required
                    className="rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                  />
                  <input
                    aria-label="Report end"
                    name="to"
                    type="date"
                    defaultValue={defaultReportDates.to}
                    required
                    className="rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                  />
                </div>
                <select
                  name="format"
                  className="rounded-xl border border-[#d7ddd6] px-3 py-2 text-sm"
                >
                  <option value="CSV">CSV</option>
                  <option value="JSON">JSON</option>
                </select>
              </div>
              <button
                disabled={busy !== null}
                className="mt-4 w-full rounded-xl border border-[#b9c8bb] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Generate download
              </button>
            </form>

            <section className="rounded-2xl border border-[#dce2db] bg-white p-5">
              <h2 className="font-semibold">Available downloads</h2>
              <div className="mt-3 space-y-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f7f4] p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{report.title}</p>
                      <p className="text-xs text-[#6c786f]">
                        {report.rowCount} rows · {report.format}
                      </p>
                    </div>
                    {report.status === "READY" ? (
                      <a
                        href={`/api/reports/${report.id}/download`}
                        className="grid size-9 place-items-center rounded-lg bg-white"
                        aria-label={`Download ${report.title}`}
                      >
                        <Download className="size-4" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#9a5a45]">Expired</span>
                    )}
                  </div>
                ))}
              </div>
              {!reports.length ? (
                <p className="mt-3 text-sm text-[#6c786f]">
                  No reports generated yet.
                </p>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
