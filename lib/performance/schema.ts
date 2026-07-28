import { z } from "zod";

const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;
const commissionStatuses = [
  "ESTIMATED",
  "PENDING",
  "APPROVED",
  "PAID",
  "REVERSED",
] as const;

const commissionImportSchema = z.object({
  amount: z.number().finite().nonnegative().max(1_000_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  status: z.enum(commissionStatuses),
  observedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime().nullable().optional(),
});

const conversionImportSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .regex(/^trk_[a-f0-9]{32}$/),
  externalOrderId: z.string().trim().min(3).max(240),
  orderStatus: z.enum(orderStatuses),
  orderValue: z.number().finite().nonnegative().max(1_000_000_000).nullable(),
  currency: z.string().trim().length(3).toUpperCase().default("INR"),
  convertedAt: z.iso.datetime(),
  commission: commissionImportSchema.nullable().optional(),
});

export const attributionImportSchema = z.object({
  records: z.array(conversionImportSchema).min(1).max(250),
});

export const performanceQuerySchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .transform((value) => {
    const to = value.to ? new Date(value.to) : new Date();
    const from = value.from
      ? new Date(value.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60_000);
    return { from: from.toISOString(), to: to.toISOString() };
  })
  .refine(({ from, to }) => new Date(from) <= new Date(to), {
    message: "Performance range start cannot be after its end.",
  });

export type AttributionImport = z.infer<typeof attributionImportSchema>;
