import { z } from "zod";

const meeshoUrl = z
  .url()
  .refine((value) => new URL(value).hostname.endsWith("meesho.com"), {
    message: "A Meesho URL is required.",
  });

export const meeshoWorkflowImportSchema = z.object({
  productId: z.string().trim().min(1).nullable().optional(),
  productUrl: meeshoUrl,
  title: z.string().trim().min(3).max(500),
  imageUrl: z.url(),
  category: z.string().trim().min(2).max(160),
  price: z.number().finite().positive(),
  originalPrice: z.number().finite().positive().nullable().default(null),
  supplierName: z.string().trim().max(200).nullable().default(null),
  observedAt: z.iso.datetime(),
});

export const meeshoBulkWishlistImportSchema = z.object({
  csv: z.string().min(1).max(500_000),
});

export const meeshoAutoDmReportImportSchema = z.object({
  csv: z.string().min(1).max(1_000_000),
  reportDate: z.iso.date().optional(),
});

export const meeshoWorkflowActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("record-affiliate-link"),
    affiliateUrl: meeshoUrl,
    factsVerified: z.literal(true),
  }),
  z.object({
    action: z.literal("render-creative"),
    caption: z.string().trim().min(20).max(2200),
    hashtags: z.array(z.string().regex(/^#[A-Za-z0-9_]+$/)).max(30),
    generatedContentId: z.string().trim().min(1).nullable().optional(),
  }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("retry-publish") }),
  z.object({
    action: z.literal("confirm-autodm"),
    triggerWords: z
      .array(z.string().trim().min(1).max(30))
      .min(1)
      .max(10)
      .default(["LINK", "PRICE", "DETAILS", "DM"]),
  }),
  z.object({
    action: z.literal("record-enrollment-failure"),
    errorCode: z.string().trim().min(2).max(80),
    errorMessage: z.string().trim().min(2).max(500),
  }),
  z.object({ action: z.literal("retry-enrollment") }),
]);

export type MeeshoWorkflowImport = z.infer<typeof meeshoWorkflowImportSchema>;
export type MeeshoWorkflowAction = z.infer<typeof meeshoWorkflowActionSchema>;
export type MeeshoBulkWishlistImport = z.infer<
  typeof meeshoBulkWishlistImportSchema
>;
export type MeeshoAutoDmReportImport = z.infer<
  typeof meeshoAutoDmReportImportSchema
>;

export interface MeeshoAutoDmMetrics {
  delivered: number;
  opened: number;
  clicked: number;
  conversions: number;
  revenue: number;
  commission: number;
}

export const MEESHO_WORKFLOW_STATUSES = [
  "IMPORTED",
  "LINK_READY",
  "CREATIVE_READY",
  "APPROVED",
  "PUBLISHING",
  "PUBLISHED",
  "AUTODM_ENROLLED",
  "RETRY_SCHEDULED",
  "FAILED",
] as const;

export type MeeshoWorkflowStatus = (typeof MEESHO_WORKFLOW_STATUSES)[number];

export interface MeeshoCreatorWorkflow {
  id: string;
  ownerEmail: string;
  productId: string | null;
  source: "MEESHO_WISHLIST";
  status: MeeshoWorkflowStatus;
  productUrl: string;
  affiliateUrl: string | null;
  title: string;
  imageUrl: string;
  category: string;
  price: number;
  originalPrice: number | null;
  supplierName: string | null;
  observedAt: string;
  factsVerifiedAt: string | null;
  generatedContentId: string | null;
  caption: string | null;
  hashtags: string[];
  creativePublicToken: string | null;
  creativeRenderedAt: string | null;
  approvedAt: string | null;
  instagramCreationId: string | null;
  instagramMediaId: string | null;
  instagramPermalink: string | null;
  publishedAt: string | null;
  autoDmEnrolledAt: string | null;
  autoDmTriggerWords: string[];
  publishAttemptCount: number;
  nextRetryAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  autoDmMetrics: MeeshoAutoDmMetrics;
  lastAutoDmReportAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function summarizeMeeshoWorkflowList(
  workflows: MeeshoCreatorWorkflow[],
) {
  const byStatus = Object.fromEntries(
    [...new Set(workflows.map(({ status }) => status))].map((status) => [
      status,
      workflows.filter((item) => item.status === status).length,
    ]),
  );
  return {
    total: workflows.length,
    published: workflows.filter(({ publishedAt }) => publishedAt).length,
    autoDmEnrolled: workflows.filter(({ autoDmEnrolledAt }) => autoDmEnrolledAt)
      .length,
    awaitingHumanAction: workflows.filter(({ status }) =>
      ["IMPORTED", "LINK_READY", "CREATIVE_READY", "PUBLISHED"].includes(
        status,
      ),
    ).length,
    retryScheduled: workflows.filter(
      ({ status }) => status === "RETRY_SCHEDULED",
    ).length,
    failed: workflows.filter(({ status }) => status === "FAILED").length,
    delivered: workflows.reduce(
      (sum, item) => sum + item.autoDmMetrics.delivered,
      0,
    ),
    conversions: workflows.reduce(
      (sum, item) => sum + item.autoDmMetrics.conversions,
      0,
    ),
    commission: workflows.reduce(
      (sum, item) => sum + item.autoDmMetrics.commission,
      0,
    ),
    byStatus,
  };
}
