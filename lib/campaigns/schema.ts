import { z } from "zod";

export const campaignStatuses = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

const optionalTimestamp = z.iso.datetime().nullable().optional();

export const campaignInputSchema = z
  .object({
    name: z.string().trim().min(3).max(160),
    objective: z.string().trim().min(3).max(500),
    channel: z.string().trim().min(2).max(80),
    startsAt: optionalTimestamp,
    endsAt: optionalTimestamp,
    budget: z.number().finite().nonnegative().max(1_000_000_000).nullable(),
    currency: z.string().trim().length(3).toUpperCase().default("INR"),
    notes: z.string().trim().max(4000).nullable().optional(),
    templateName: z.string().trim().max(160).nullable().optional(),
    creatorAccountId: z.string().trim().min(1).max(160).nullable().optional(),
  })
  .refine(
    ({ startsAt, endsAt }) =>
      !startsAt || !endsAt || new Date(endsAt) >= new Date(startsAt),
    {
      message: "Campaign end date cannot be before its start date.",
      path: ["endsAt"],
    },
  );

export const campaignQuerySchema = z.object({
  q: z.string().trim().max(160).default(""),
  status: z.enum(campaignStatuses).optional(),
  channel: z.string().trim().max(80).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const campaignActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("duplicate") }),
  z.object({ action: z.literal("archive") }),
]);

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type CampaignQuery = z.infer<typeof campaignQuerySchema>;
