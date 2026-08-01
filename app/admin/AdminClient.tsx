"use client";

import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  DatabaseBackup,
  Flag,
  Gauge,
  IndianRupee,
  LoaderCircle,
  Save,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AdminOverview } from "@/lib/admin/types";

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? "The request failed.");
  }
  return payload.data;
}

export function AdminClient({
  initialOverview,
  currentEmail,
}: {
  initialOverview: AdminOverview;
  currentEmail: string;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function begin(key: string) {
    setBusy(key);
    setMessage(null);
    setError(null);
  }

  function fail(caught: unknown) {
    setError(caught instanceof Error ? caught.message : "The request failed.");
    setBusy(null);
  }

  async function refresh() {
    setOverview(
      await readResponse<AdminOverview>(await fetch("/api/admin/overview")),
    );
  }

  async function updateFlag(
    flag: AdminOverview["featureFlags"][number],
    enabled: boolean,
  ) {
    begin(`flag:${flag.key}`);
    try {
      await readResponse(
        await fetch(`/api/admin/feature-flags/${flag.key}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            enabled,
            rolloutPercent: enabled ? Math.max(flag.rolloutPercent, 100) : 0,
          }),
        }),
      );
      await refresh();
      setMessage(`${flag.key} was ${enabled ? "enabled" : "disabled"}.`);
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function updateUser(
    user: AdminOverview["users"][number],
    input: { role: string; status: string },
  ) {
    begin(`user:${user.email}`);
    try {
      await readResponse(
        await fetch(`/api/admin/users/${encodeURIComponent(user.email)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
      await refresh();
      setMessage(`${user.email} was updated.`);
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function updateRetention(
    policy: AdminOverview["retentionPolicies"][number],
    retentionDays: number,
  ) {
    begin(`retention:${policy.key}`);
    try {
      await readResponse(
        await fetch(`/api/admin/retention/${policy.key}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled: policy.enabled, retentionDays }),
        }),
      );
      await refresh();
      setMessage(`${policy.key} retention was updated.`);
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin("template");
    const form = new FormData(event.currentTarget);
    try {
      await readResponse(
        await fetch("/api/admin/templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: form.get("kind"),
            name: form.get("name"),
            content: form.get("content"),
            status: form.get("status"),
          }),
        }),
      );
      event.currentTarget.reset();
      await refresh();
      setMessage("A versioned template was created.");
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function requestBackup() {
    begin("backup");
    try {
      const result = await readResponse<{ status: string; errorCode?: string }>(
        await fetch("/api/admin/backups", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "request", scope: "DATABASE" }),
        }),
      );
      await refresh();
      setMessage(
        result.status === "BLOCKED"
          ? "Backup request recorded, but no backup transport is configured."
          : "Backup request started.",
      );
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  async function resolveSecurityEvent(id: string) {
    begin(`security:${id}`);
    try {
      await readResponse(
        await fetch(`/api/admin/security-events/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "resolve" }),
        }),
      );
      await refresh();
      setMessage("Security event resolved with administrator attribution.");
      setBusy(null);
    } catch (caught) {
      fail(caught);
    }
  }

  const cards = [
    [Users, "Managed users", overview.counts.users],
    [DatabaseBackup, "Active sources", overview.counts.activeSources],
    [Activity, "Automation jobs", overview.counts.automationJobs],
    [
      ShieldAlert,
      "Open security events",
      overview.counts.unresolvedSecurityEvents,
    ],
    [Gauge, "Queued background jobs", overview.counts.queuedJobs],
    [
      IndianRupee,
      "AI cost · 30 days",
      `₹${overview.aiUsage.costInr.toFixed(2)}`,
    ],
  ] as const;

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
              Phase 3 administration
            </p>
            <p className="mt-1 font-semibold">Operations & governance</p>
          </div>
          <span className="ml-auto text-xs text-white/60">{currentEmail}</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-7 lg:px-10">
        <section>
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            One control plane
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            System health, access, cost, and change history
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d6a61]">
            Every administrative mutation is validated, administrator-only, and
            written to an audit trail. Credential-dependent controls remain
            visibly gated.
          </p>
        </section>

        {message ? (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" />
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map(([Icon, label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#dce2db] bg-white p-4"
            >
              <Icon className="size-4 text-[#377448]" />
              <p className="mt-4 text-xs text-[#6c786f]">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <nav className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Marketplace sources", "/sources"],
            ["Scheduled automation", "/automation"],
            ["Scoring governance", "/optimization"],
            ["Marketplace policies", "/policies"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-[#dce2db] bg-white p-4 text-sm font-semibold"
            >
              {label} →
            </Link>
          ))}
        </nav>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Flag className="size-4" />
              Feature flags
            </h2>
            <div className="mt-4 space-y-3">
              {overview.featureFlags.map((flag) => (
                <div
                  key={flag.key}
                  className="flex items-start justify-between gap-4 rounded-xl bg-[#f5f7f4] p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{flag.key}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6c786f]">
                      {flag.description}
                    </p>
                    <p className="mt-1 text-[10px] text-[#7d887f]">
                      Rollout {flag.rolloutPercent}%
                    </p>
                  </div>
                  <button
                    onClick={() => updateFlag(flag, !flag.enabled)}
                    disabled={busy !== null}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${flag.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                  >
                    {flag.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="size-4" />
              User management
            </h2>
            <div className="mt-4 space-y-3">
              {overview.users.map((user) => (
                <div key={user.email} className="rounded-xl bg-[#f5f7f4] p-4">
                  <p className="text-sm font-semibold">
                    {user.displayName ?? user.email}
                  </p>
                  <p className="text-xs text-[#6c786f]">{user.email}</p>
                  <div className="mt-3 flex gap-2">
                    <select
                      aria-label={`Role for ${user.email}`}
                      value={user.role}
                      onChange={(event) =>
                        updateUser(user, {
                          role: event.target.value,
                          status: user.status,
                        })
                      }
                      disabled={busy !== null}
                      className="rounded-lg border border-[#d7ddd6] bg-white px-2 py-1.5 text-xs"
                    >
                      <option>ADMIN</option>
                      <option>USER</option>
                    </select>
                    <select
                      aria-label={`Status for ${user.email}`}
                      value={user.status}
                      onChange={(event) =>
                        updateUser(user, {
                          role: user.role,
                          status: event.target.value,
                        })
                      }
                      disabled={busy !== null || user.email === currentEmail}
                      className="rounded-lg border border-[#d7ddd6] bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                    >
                      <option>ACTIVE</option>
                      <option>SUSPENDED</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <h2 className="font-semibold">Data retention</h2>
            <div className="mt-4 space-y-3">
              {overview.retentionPolicies.map((policy) => (
                <label
                  key={policy.key}
                  className="block rounded-xl bg-[#f5f7f4] p-3 text-xs font-semibold"
                >
                  {policy.key}
                  <span className="mt-1 block leading-5 font-normal text-[#6c786f]">
                    {policy.description}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      defaultValue={policy.retentionDays}
                      className="w-24 rounded-lg border border-[#d7ddd6] bg-white px-2 py-1.5"
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (value !== policy.retentionDays)
                          void updateRetention(policy, value);
                      }}
                    />
                    <span>days</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Bot className="size-4" />
              Prompt & content templates
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {overview.templates.map((template) => (
                <div key={template.id} className="rounded-xl bg-[#f5f7f4] p-3">
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="mt-1 text-xs text-[#6c786f]">
                    {template.kind} · v{template.version} · {template.status}
                  </p>
                </div>
              ))}
            </div>
            <form
              onSubmit={createTemplate}
              className="mt-5 grid gap-3 rounded-xl border border-[#dce2db] p-4"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  name="kind"
                  className="rounded-lg border border-[#d7ddd6] px-3 py-2 text-sm"
                >
                  <option>AI_PROMPT</option>
                  <option>CONTENT_TEMPLATE</option>
                </select>
                <input
                  name="name"
                  placeholder="Template name"
                  required
                  minLength={3}
                  className="rounded-lg border border-[#d7ddd6] px-3 py-2 text-sm sm:col-span-2"
                />
              </div>
              <textarea
                name="content"
                placeholder="Versioned template content"
                required
                minLength={20}
                rows={4}
                className="rounded-lg border border-[#d7ddd6] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <select
                  name="status"
                  className="rounded-lg border border-[#d7ddd6] px-3 py-2 text-sm"
                >
                  <option>DRAFT</option>
                  <option>ACTIVE</option>
                  <option>ARCHIVED</option>
                </select>
                <button
                  disabled={busy !== null}
                  className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#173f2a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy === "template" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Create version
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Backup & restore controls</h2>
              <button
                onClick={requestBackup}
                disabled={busy !== null}
                className="rounded-lg border border-[#b9c8bb] px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Request backup
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6c786f]">
              A request is never reported as successful without a configured
              backup transport and recoverable storage reference.
            </p>
            <div className="mt-4 space-y-2">
              {overview.backups.map((backup) => (
                <div
                  key={backup.id}
                  className="rounded-xl bg-[#f5f7f4] p-3 text-xs"
                >
                  <p className="font-semibold">
                    {backup.scope} · {backup.status}
                  </p>
                  <p className="mt-1 text-[#6c786f]">
                    {backup.errorCode ?? "No error"} ·{" "}
                    {new Date(backup.startedAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#dce2db] bg-white p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-4" />
              Security events
            </h2>
            <div className="mt-4 space-y-2">
              {overview.securityEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[#f5f7f4] p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold">
                      {event.severity} · {event.eventType}
                    </p>
                    <p className="mt-1 text-[#6c786f]">
                      {event.actorEmail ?? "anonymous"} ·{" "}
                      {event.region ?? "unknown region"}
                    </p>
                  </div>
                  {!event.resolvedAt ? (
                    <button
                      onClick={() => resolveSecurityEvent(event.id)}
                      disabled={busy !== null}
                      className="font-semibold text-[#276f3c]"
                    >
                      Resolve
                    </button>
                  ) : (
                    <span className="text-emerald-700">Resolved</span>
                  )}
                </div>
              ))}
              {!overview.securityEvents.length ? (
                <p className="text-sm text-[#6c786f]">
                  No security events recorded.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#dce2db] bg-white p-5">
          <h2 className="font-semibold">Administrator activity log</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-[#68736b]">
                <tr>
                  <th className="pb-2">Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {overview.auditEvents.map((event) => (
                  <tr key={event.id} className="border-t border-[#edf0ec]">
                    <td className="py-3">
                      {new Date(event.occurredAt).toLocaleString("en-IN")}
                    </td>
                    <td>{event.actorEmail}</td>
                    <td>{event.action}</td>
                    <td>
                      {event.entityType}
                      {event.entityId ? ` · ${event.entityId}` : ""}
                    </td>
                    <td>{event.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
