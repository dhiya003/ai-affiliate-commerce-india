export interface AdminOverview {
  counts: {
    users: number;
    activeSources: number;
    failingSources: number;
    automationJobs: number;
    failingJobs: number;
    queuedJobs: number;
    unresolvedSecurityEvents: number;
  };
  aiUsage: {
    units: number;
    costInr: number;
  };
  marketplaceCosts: Array<{
    marketplace: string;
    costInr: number;
  }>;
  users: Array<{
    email: string;
    displayName: string | null;
    role: string;
    status: string;
    lastSeenAt: string | null;
  }>;
  featureFlags: Array<{
    key: string;
    description: string;
    enabled: boolean;
    rolloutPercent: number;
    updatedAt: string;
  }>;
  retentionPolicies: Array<{
    key: string;
    description: string;
    retentionDays: number;
    enabled: boolean;
    updatedAt: string;
  }>;
  templates: Array<{
    id: string;
    kind: string;
    name: string;
    version: number;
    status: string;
    updatedAt: string;
  }>;
  securityEvents: Array<{
    id: string;
    severity: string;
    eventType: string;
    actorEmail: string | null;
    region: string | null;
    occurredAt: string;
    resolvedAt: string | null;
  }>;
  auditEvents: Array<{
    id: string;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string | null;
    outcome: string;
    occurredAt: string;
  }>;
  backups: Array<{
    id: string;
    status: string;
    scope: string;
    startedAt: string;
    completedAt: string | null;
    restoreTestedAt: string | null;
    errorCode: string | null;
  }>;
}
