import { z } from "zod";

const optionalScore = z.number().finite().min(0).max(100).nullish();

export const productScoringInputSchema = z
  .object({
    productId: z.string().trim().min(1),
    rating: z.number().finite().min(0).max(5).nullable(),
    reviewCount: z.number().int().min(0),
    currentPrice: z.number().finite().positive(),
    originalPrice: z.number().finite().positive().nullable(),
    commissionRate: z.number().finite().min(0).max(100).nullable(),
    sellerRating: z.number().finite().min(0).max(5).nullable(),
    returnRisk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
    competitionScore: optionalScore,
    trendScore: optionalScore,
    demandScore: optionalScore,
  })
  .superRefine((input, context) => {
    if (
      input.originalPrice !== null &&
      input.originalPrice < input.currentPrice
    ) {
      context.addIssue({
        code: "custom",
        message: "Original price cannot be lower than current price",
        path: ["originalPrice"],
      });
    }
  });
