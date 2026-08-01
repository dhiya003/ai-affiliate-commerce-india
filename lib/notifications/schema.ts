import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "DAILY_OPPORTUNITY_SUMMARY",
  "WEEKLY_PERFORMANCE_SUMMARY",
  "MONTHLY_EARNINGS_SUMMARY",
  "NEW_TRENDING_PRODUCT",
  "PRICE_DROP",
  "STOCK_RETURN",
  "AFFILIATE_RULE_CHANGE",
  "CAMPAIGN_PERFORMANCE",
  "LOW_CONVERSION",
  "HIGH_RETURN_RISK",
  "FAILED_IMPORT",
  "STALE_PRICE",
  "BROKEN_AFFILIATE_LINK",
  "COMPLIANCE_FAILURE",
  "HIGH_OPPORTUNITY_PRODUCT",
] as const;

export const notificationPreferenceSchema = z
  .object({
    inAppEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    digestFrequency: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]),
    enabledTypes: z
      .array(z.enum(NOTIFICATION_TYPES))
      .max(NOTIFICATION_TYPES.length),
    quietHoursStart: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    quietHoursEnd: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
  })
  .refine(
    ({ quietHoursStart, quietHoursEnd }) =>
      Boolean(quietHoursStart) === Boolean(quietHoursEnd),
    {
      path: ["quietHoursEnd"],
      message: "Quiet hours require both a start and end time.",
    },
  );

export const notificationReadSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read") }),
  z.object({ action: z.literal("unread") }),
]);

export const notificationBulkActionSchema = z.object({
  action: z.literal("read-all"),
});

export const reportGenerationSchema = z
  .object({
    type: z.enum([
      "DAILY_OPPORTUNITY",
      "WEEKLY_PERFORMANCE",
      "MONTHLY_EARNINGS",
    ]),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    format: z.enum(["CSV", "JSON"]).default("CSV"),
  })
  .refine(({ from, to }) => new Date(from) <= new Date(to), {
    path: ["to"],
    message: "Report end cannot be before its start.",
  })
  .refine(
    ({ from, to }) =>
      new Date(to).getTime() - new Date(from).getTime() <=
      366 * 24 * 60 * 60_000,
    { path: ["to"], message: "Report range cannot exceed 366 days." },
  );

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;
export type ReportGenerationInput = z.infer<typeof reportGenerationSchema>;
