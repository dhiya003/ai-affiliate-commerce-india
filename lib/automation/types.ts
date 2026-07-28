export interface AutomationRun {
  id: string;
  jobId: string;
  parentRunId: string | null;
  triggerType: string;
  status: string;
  attempt: number;
  scheduledFor: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  timeoutAt: string | null;
  initiatedByEmail: string | null;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  metrics: Record<string, unknown>;
  errorCode: string | null;
  errorSummary: string | null;
  nextRetryAt: string | null;
}

export interface AutomationJob {
  id: string;
  jobKey: string;
  jobType: string;
  name: string;
  description: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  status: string;
  timeoutSeconds: number;
  maxAttempts: number;
  retryBaseSeconds: number;
  dependsOnJobKey: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  updatedAt: string;
  latestRun: AutomationRun | null;
}
