import { z } from "zod";
import { MARKETPLACES } from "./types.ts";

const nullableUrl = z.url().nullable().optional();
const nullableNumber = (maximum?: number) => {
  const schema = z.number().nonnegative();
  return (maximum == null ? schema : schema.max(maximum)).nullable().optional();
};

export const sourceRecordSchema = z.object({
  marketplaceProductId: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2).max(300),
  brand: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  productUrl: z.url(),
  affiliateUrl: nullableUrl,
  imageUrl: nullableUrl,
  category: z.string().trim().min(2).max(120),
  sellerName: z.string().trim().max(200).nullable().optional(),
  currentPrice: z.number().positive().max(100_000_000),
  originalPrice: nullableNumber(100_000_000),
  rating: nullableNumber(5),
  reviewCount: z.number().int().nonnegative().default(0),
  commissionRate: nullableNumber(100),
  sellerRating: nullableNumber(5),
  stockStatus: z
    .enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"])
    .default("UNKNOWN"),
  returnRisk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).default("UNKNOWN"),
  sourceTimestamp: z.iso.datetime(),
  availabilityStatus: z
    .enum(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"])
    .default("UNKNOWN"),
  confidence: z.number().min(0).max(1).default(0.8),
});

export const manualIngestionSchema = z.object({
  sourceId: z.string().trim().min(1).max(160),
  marketplace: z.enum(MARKETPLACES),
  records: z.array(sourceRecordSchema).min(1).max(250),
});

export const retryIngestionSchema = z.object({
  runId: z.string().trim().min(1).max(160),
});

export type SourceRecord = z.infer<typeof sourceRecordSchema>;
export type ManualIngestionInput = z.infer<typeof manualIngestionSchema>;
