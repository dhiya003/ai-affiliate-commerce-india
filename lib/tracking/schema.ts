import { z } from "zod";
import { MARKETPLACES } from "../ingestion/types.ts";

const httpsUrl = z
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Tracking destinations must use HTTPS.",
  });

export const promotionInputSchema = z
  .object({
    productId: z.string().trim().min(1).max(160),
    generatedContentId: z.string().trim().min(1).max(160).nullable().optional(),
    contentVariationId: z.string().trim().min(1).max(160).nullable().optional(),
    scheduledAt: z.iso.datetime().nullable().optional(),
    publishedAt: z.iso.datetime().nullable().optional(),
    publishedUrl: httpsUrl.nullable().optional(),
    destinationUrl: httpsUrl,
  })
  .refine(
    ({ publishedAt, publishedUrl }) => !publishedAt || Boolean(publishedUrl),
    {
      message: "Published promotions require a published content URL.",
      path: ["publishedUrl"],
    },
  );

export const marketplaceDestinationHosts: Record<
  (typeof MARKETPLACES)[number],
  readonly string[]
> = {
  Amazon: ["amazon.in", "amzn.to"],
  Flipkart: ["flipkart.com", "fkrt.it"],
  Meesho: ["meesho.com"],
  Myntra: ["myntra.com"],
  AJIO: ["ajio.com"],
};

export function destinationMatchesMarketplace(
  marketplace: (typeof MARKETPLACES)[number],
  destination: string,
): boolean {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return marketplaceDestinationHosts[marketplace].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export type PromotionInput = z.infer<typeof promotionInputSchema>;
