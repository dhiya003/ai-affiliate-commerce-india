export const POLICY_KINDS = [
  "MARKETPLACE_RULE",
  "COMMISSION_RULE",
  "CONTENT_POLICY",
  "AFFILIATE_DISCLOSURE",
  "PROHIBITED_PRACTICE",
] as const;

export const POLICY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "NEEDS_REVIEW",
  "RETIRED",
] as const;

export type PolicyKind = (typeof POLICY_KINDS)[number];
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export interface PolicyRecord {
  id: string;
  kind: PolicyKind;
  marketplace: string;
  title: string;
  summary: string;
  effectiveAt: string;
  sourceUrl: string;
  status: PolicyStatus;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  ruleType: string | null;
  category: string | null;
  rateMin: number | null;
  rateMax: number | null;
  channel: string | null;
  disclosureText: string | null;
  placement: string | null;
  severity: string | null;
}

export interface PlatformUpdate {
  id: string;
  marketplace: string;
  policyKind: PolicyKind;
  policyId: string | null;
  changeType: string;
  previousStatus: PolicyStatus | null;
  nextStatus: PolicyStatus | null;
  summary: string;
  sourceUrl: string;
  detectedAt: string;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
}

export interface PolicyKnowledgeBase {
  policies: PolicyRecord[];
  updates: PlatformUpdate[];
  summary: {
    total: number;
    active: number;
    needsReview: number;
    blockingPractices: number;
  };
}
