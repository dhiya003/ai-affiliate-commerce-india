import { z } from "zod";
import {
  MARKETPLACES,
  PRODUCT_STATUSES,
  RETURN_RISKS,
  STOCK_STATUSES,
} from "./types.ts";

const optionalUrl = z
  .union([z.url(), z.literal("")])
  .transform((value) => value || null)
  .nullish();

const optionalNumber = (minimum: number, maximum: number) =>
  z.number().finite().min(minimum).max(maximum).nullish();

const productInputObjectSchema = z.object({
  marketplace: z.enum(MARKETPLACES),
  marketplaceProductId: z.string().trim().min(2).max(120),
  name: z.string().trim().min(3).max(240),
  description: z.string().trim().max(2_000).nullish(),
  productUrl: z.url(),
  affiliateUrl: optionalUrl,
  imageUrl: optionalUrl,
  category: z.string().trim().min(2).max(120),
  sellerName: z.string().trim().max(160).nullish(),
  currentPrice: z.number().finite().positive().max(10_000_000),
  originalPrice: optionalNumber(0.01, 10_000_000),
  rating: optionalNumber(0, 5),
  reviewCount: z.number().int().min(0).max(100_000_000).default(0),
  commissionRate: optionalNumber(0, 100),
  sellerRating: optionalNumber(0, 5),
  stockStatus: z.enum(STOCK_STATUSES).default("UNKNOWN"),
  returnRisk: z.enum(RETURN_RISKS).default("UNKNOWN"),
  status: z.enum(PRODUCT_STATUSES).default("NEW"),
  notes: z.string().trim().max(4_000).nullish(),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(20)
    .default([])
    .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
});

export const productInputSchema = productInputObjectSchema.superRefine(
  (input, context) => {
    if (
      input.originalPrice != null &&
      input.originalPrice < input.currentPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["originalPrice"],
        message: "Original price cannot be lower than current price.",
      });
    }
  },
);

export const productUpdateSchema = productInputObjectSchema
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    "At least one product field is required.",
  );

export const productStatusInputSchema = z.object({
  status: z.enum(PRODUCT_STATUSES),
  note: z.string().trim().max(500).nullish(),
});

export const productListQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    marketplace: z.enum(MARKETPLACES).optional(),
    category: z.string().trim().max(120).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z
      .enum(["score", "newest", "price-asc", "price-desc", "rating"])
      .default("score"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
  })
  .superRefine((query, context) => {
    if (
      query.minPrice != null &&
      query.maxPrice != null &&
      query.maxPrice < query.minPrice
    ) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Maximum price cannot be lower than minimum price.",
      });
    }
  });

export const csvImportInputSchema = z.object({
  csv: z.string().min(1).max(1_000_000),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
