import type { ContentBundle } from "@/lib/content/schema";
import type { Product } from "@/lib/products/types";

export const COMPLIANCE_STATUSES = [
  "PASS",
  "WARNING",
  "FAIL",
  "OVERRIDDEN",
] as const;
export const COMPLIANCE_SEVERITIES = [
  "INFO",
  "WARNING",
  "HIGH",
  "BLOCKING",
] as const;

export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];
export type ComplianceSeverity = (typeof COMPLIANCE_SEVERITIES)[number];

export interface ComplianceInput {
  product: Product;
  content: ContentBundle;
}

export interface ComplianceResult {
  ruleCode: string;
  status: Exclude<ComplianceStatus, "OVERRIDDEN">;
  severity: ComplianceSeverity;
  message: string;
  fixSuggestion: string | null;
  evidence: Record<string, unknown>;
}

export interface ComplianceEvaluation {
  status: Exclude<ComplianceStatus, "OVERRIDDEN">;
  highestSeverity: ComplianceSeverity;
  exportBlocked: boolean;
  results: ComplianceResult[];
}

export interface StoredComplianceCheck {
  id: string;
  productId: string;
  generatedContentId: string | null;
  marketplace: string;
  status: ComplianceStatus;
  highestSeverity: ComplianceSeverity;
  exportBlocked: boolean;
  results: ComplianceResult[];
  checkedByEmail: string;
  checkedAt: string;
  overriddenAt: string | null;
  overriddenByEmail: string | null;
  overrideReason: string | null;
}
