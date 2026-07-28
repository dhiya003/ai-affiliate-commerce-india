"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Play,
  RefreshCw,
  Settings2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { AutomationJob, AutomationRun } from "@/lib/automation/types";

interface Envelope<T> {
  data?: T;
  error?: { message: string };
}

interface RunLog {
  id: string;
  level: string;
  event: string;
  message: string;
  occurredAt: string;
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "The request failed.");
  }
  return payload.data;
}

function statusClass(status: string) {
  if (status === "HEALTHY" || status === "SUCCEEDED")
    return "bg-emerald-50 text-emerald-700";
  if (status === "RUNNING" || status === "QUEUED")
    return "bg-blue-50 text-blue-700";
  if (status === "FAILING" || status === "FAILED" || status === "TIMED_OUT")
    return "bg-red-50 text-red-700";
  if (status === "DEGRADED" || status === "SKIPPED")
    return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function AutomationClient({
  initialJobs,
}: {
  initialJobs: AutomationJob[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState(initialJobs[0]?.id ?? "");
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedJob = jobs.find(({ id }) => id === selectedJobId);
  const health = useMemo(
    () => ({
      enabled: jobs.filter(({ enabled }) => enabled).length,
      failing: jobs.filter(({ status }) => status === "FAILING").length,
      degraded: jobs.filter(({ status }) => status === "DEGRADED").length,
      successful: jobs.filter(
        ({ latestRun }) => latestRun?.status === "SUCCEEDED",
      ).length,
    }),
    [jobs],
  );

  function begin(key: string) {
    setBusy(key);
    setNotice(null);
    setError(null);
  }

  function fail(caught: unknown) {
    setError(caught instanceof Error ? caught.message : "The request failed.");
    setBusy(null);
  }

  async function refreshJobs() {
    const refreshed = await readResponse<AutomationJob[]>(
      await fetch("/api/automation/jobs"),
    );
    setJobs(refreshed);
    return refreshed;
  }

  async function updateJob(job: AutomationJob, input: Record<string, unknown>) {
    begin(`update:${job.id}`);
    try {
      const updated = await readResponse<AutomationJob>(
        await fetch(`/api/automation/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
      setJobs((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(`${updated.name} settings were saved.`);
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedJob) return;
    const form = new FormData(event.currentTarget);
    await updateJob(selectedJob, {
      cronExpression: form.get("cronExpression"),
      timeoutSeconds: Number(form.get("timeoutSeconds")),
      maxAttempts: Number(form.get("maxAttempts")),
      retryBaseSeconds: Number(form.get("retryBaseSeconds")),
    });
  }

  async function runJob(job: AutomationJob) {
    begin(`run:${job.id}`);
    try {
      const run = await readResponse<AutomationRun>(
        await fetch(`/api/automation/jobs/${job.id}/run`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "run" }),
        }),
      );
      await refreshJobs();
      setSelectedJobId(job.id);
      setNotice(`${job.name} finished with status ${run.status}.`);
      const runLogs = await readResponse<RunLog[]>(
        await fetch(`/api/automation/runs/${run.id}/logs`),
      );
      setLogs(runLogs);
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
  }

  async function loadLogs(runId: string) {
    begin(`logs:${runId}`);
    try {
      setLogs(
        await readResponse<RunLog[]>(
          await fetch(`/api/automation/runs/${runId}/logs`),
        ),
      );
    } catch (caught) {
      fail(caught);
      return;
    }
    setBusy(null);
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
              Phase 3 operations
            </p>
            <p className="mt-1 font-semibold">Scheduled automation</p>
          </div>
          <Link
            href="/optimization"
            className="ml-auto rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
          >
            Scoring governance
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
        <section>
          <p className="text-xs font-bold tracking-[0.16em] text-[#4c815b] uppercase">
            Observable and recoverable
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Control every scheduled job, dependency, retry, and timeout
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a61]">
            All seeded schedules begin paused. A skipped run means its external
            transport or handler remains deliberately gated—not that work was
            silently treated as successful.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Enabled jobs", health.enabled],
            ["Successful latest runs", health.successful],
            ["Degraded jobs", health.degraded],
            ["Failing jobs", health.failing],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#dce2db] bg-white p-4"
            >
              <p className="text-xs text-[#6c786f]">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        {notice ? (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" /> {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                className={`rounded-2xl border bg-white p-5 ${
                  selectedJobId === job.id
                    ? "border-[#74aa81]"
                    : "border-[#dce2db]"
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className="text-left"
                  >
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{job.name}</h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#5d6a61]">
                      {job.description}
                    </p>
                    <p className="mt-2 text-xs text-[#6c786f]">
                      {job.cronExpression} · {job.timezone}
                      {job.dependsOnJobKey
                        ? ` · after ${job.dependsOnJobKey}`
                        : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void updateJob(job, { enabled: !job.enabled })
                      }
                      disabled={busy !== null}
                      className="rounded-lg border border-[#cad3ca] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      {job.enabled ? "Pause" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runJob(job)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#102c1e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy === `run:${job.id}` ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      Run now
                    </button>
                  </div>
                </div>
                {job.latestRun ? (
                  <button
                    type="button"
                    onClick={() => void loadLogs(job.latestRun!.id)}
                    className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#f5f7f4] p-3 text-left text-xs"
                  >
                    <span>
                      Latest:{" "}
                      <strong
                        className={
                          statusClass(job.latestRun.status)
                            .replace("bg-", "text-")
                            .split(" ")[1]
                        }
                      >
                        {job.latestRun.status}
                      </strong>{" "}
                      · attempt {job.latestRun.attempt}
                    </span>
                    <span className="text-[#6c786f]">
                      {job.latestRun.completedAt?.slice(0, 16) ??
                        job.latestRun.queuedAt.slice(0, 16)}
                    </span>
                  </button>
                ) : null}
              </article>
            ))}
          </div>

          <div className="space-y-5">
            {selectedJob ? (
              <form
                key={selectedJob.id}
                onSubmit={(event) => void saveSettings(event)}
                className="rounded-2xl border border-[#dce2db] bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <Settings2 className="size-5 text-[#4c815b]" />
                  <div>
                    <h2 className="font-semibold">Job policy</h2>
                    <p className="text-xs text-[#6c786f]">{selectedJob.name}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <label className="block text-xs font-bold">
                    UTC cron
                    <input
                      name="cronExpression"
                      required
                      defaultValue={selectedJob.cronExpression}
                      className="field-control mt-1 w-full font-mono"
                    />
                  </label>
                  <label className="block text-xs font-bold">
                    Timeout seconds
                    <input
                      type="number"
                      name="timeoutSeconds"
                      min="30"
                      max="3600"
                      required
                      defaultValue={selectedJob.timeoutSeconds}
                      className="field-control mt-1 w-full"
                    />
                  </label>
                  <label className="block text-xs font-bold">
                    Maximum attempts
                    <input
                      type="number"
                      name="maxAttempts"
                      min="1"
                      max="5"
                      required
                      defaultValue={selectedJob.maxAttempts}
                      className="field-control mt-1 w-full"
                    />
                  </label>
                  <label className="block text-xs font-bold">
                    Retry base seconds
                    <input
                      type="number"
                      name="retryBaseSeconds"
                      min="30"
                      max="3600"
                      required
                      defaultValue={selectedJob.retryBaseSeconds}
                      className="field-control mt-1 w-full"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#cad3ca] px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
                >
                  <RefreshCw className="size-3.5" /> Save policy
                </button>
              </form>
            ) : null}

            <section className="rounded-2xl border border-[#dce2db] bg-white p-5">
              <div className="flex items-center gap-3">
                <Workflow className="size-5 text-[#4c815b]" />
                <div>
                  <h2 className="font-semibold">Processing log</h2>
                  <p className="text-xs text-[#6c786f]">
                    Bounded operational messages only.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {logs.length ? (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl bg-[#f5f7f4] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong>{log.event}</strong>
                        <span>{log.level}</span>
                      </div>
                      <p className="mt-1 text-[#5d6a61]">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="flex items-center gap-2 py-5 text-sm text-[#6c786f]">
                    <Clock3 className="size-4" /> Select a latest run to inspect
                    its log.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
