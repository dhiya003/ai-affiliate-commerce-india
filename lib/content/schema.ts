import { z } from "zod";

const shortText = z.string().trim().min(2).max(300);
const longText = z.string().trim().min(20).max(4_000);

export const contentBundleSchema = z.object({
  summary: z.string().trim().min(20).max(700),
  whyPromote: longText,
  targetAudiences: z.array(shortText).min(2).max(5),
  reelHooks: z.array(shortText).length(3),
  reelScript30: longText,
  reelScript60: longText,
  caption: longText,
  hashtags: z
    .array(
      z
        .string()
        .trim()
        .regex(/^#[A-Za-z0-9_]+$/)
        .max(50),
    )
    .min(6)
    .max(20),
  ctas: z.array(shortText).min(3).max(5),
  thumbnailTexts: z.array(shortText).min(3).max(5),
  pros: z.array(shortText).min(2).max(6),
  cautions: z.array(shortText).min(1).max(5),
  affiliateDisclosure: z.string().trim().min(10).max(300),
});

export type ContentBundle = z.infer<typeof contentBundleSchema>;

export interface GeneratedContent {
  id: string;
  productId: string;
  content: ContentBundle;
  promptVersion: string;
  provider: string;
  providerModel: string;
  requestId: string | null;
  createdAt: string;
}
