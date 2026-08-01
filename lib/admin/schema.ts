import { z } from "zod";

export const featureFlagUpdateSchema = z.object({
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100),
});

export const applicationUserUpdateSchema = z.object({
  role: z.enum(["ADMIN", "USER"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const retentionPolicyUpdateSchema = z.object({
  enabled: z.boolean(),
  retentionDays: z.number().int().min(1).max(3650),
});

export const managedTemplateInputSchema = z.object({
  kind: z.enum(["AI_PROMPT", "CONTENT_TEMPLATE"]),
  name: z.string().trim().min(3).max(100),
  content: z.string().trim().min(20).max(20_000),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
});

export const backupActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), scope: z.literal("DATABASE") }),
  z.object({
    action: z.literal("record-restore-test"),
    backupRunId: z.string().min(1).max(200),
  }),
]);

export const securityEventActionSchema = z.object({
  action: z.literal("resolve"),
});

export type FeatureFlagUpdate = z.infer<typeof featureFlagUpdateSchema>;
export type ApplicationUserUpdate = z.infer<typeof applicationUserUpdateSchema>;
export type RetentionPolicyUpdate = z.infer<typeof retentionPolicyUpdateSchema>;
export type ManagedTemplateInput = z.infer<typeof managedTemplateInputSchema>;
