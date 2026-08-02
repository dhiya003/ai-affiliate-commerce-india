import { z } from "zod";

const meeshoProductUrl = z
  .url()
  .refine((value) => new URL(value).hostname.endsWith("meesho.com"), {
    message: "A Meesho product URL is required.",
  });

export const meeshoWishlistCandidateSchema = z.object({
  productUrl: meeshoProductUrl,
  affiliateUrl: meeshoProductUrl,
  title: z.string().trim().min(3).max(500),
  imageUrl: z.url(),
  category: z.string().trim().min(2).max(160),
  price: z.number().finite().positive(),
  originalPrice: z.number().finite().positive().nullable().default(null),
  supplierName: z.string().trim().max(200).nullable().default(null),
  observedAt: z.iso.datetime(),
});

export type MeeshoWishlistCandidate = z.infer<
  typeof meeshoWishlistCandidateSchema
>;

export interface MeeshoCreatorHandoff {
  source: "MEESHO_WISHLIST";
  productUrl: string;
  affiliateUrl: string;
  verifiedImageUrl: string;
  affiliateLinkCreationUrl: string;
  autoDmEnrollmentUrl: string;
  captionRules: {
    includeProductUrl: false;
    disclosureToken: "#ad";
    disclosurePlacement: "BEFORE_HASHTAGS";
    triggerCta: "Comment LINK and I’ll send the product details to your DM.";
  };
  visualTemplate: {
    aspectRatio: "4:5";
    productImagePercent: 60;
    contentPercent: 40;
    useVerifiedImageOnly: true;
  };
  requiredHumanGates: [
    "VERIFY_WISHLIST_PRODUCT",
    "CREATE_OFFICIAL_AFFILIATE_LINK",
    "APPROVE_CREATIVE_AND_CAPTION",
    "PUBLISH_INSTAGRAM_POST",
    "ENROLL_POST_IN_AUTODM",
  ];
}

export function buildMeeshoCreatorHandoff(
  candidate: MeeshoWishlistCandidate,
): MeeshoCreatorHandoff {
  const product = meeshoWishlistCandidateSchema.parse(candidate);
  return {
    source: "MEESHO_WISHLIST",
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl,
    verifiedImageUrl: product.imageUrl,
    affiliateLinkCreationUrl: "https://affiliate.meesho.com/affiliate-links",
    autoDmEnrollmentUrl: "https://affiliate.meesho.com/auto-dm-post-linking",
    captionRules: {
      includeProductUrl: false,
      disclosureToken: "#ad",
      disclosurePlacement: "BEFORE_HASHTAGS",
      triggerCta: "Comment LINK and I’ll send the product details to your DM.",
    },
    visualTemplate: {
      aspectRatio: "4:5",
      productImagePercent: 60,
      contentPercent: 40,
      useVerifiedImageOnly: true,
    },
    requiredHumanGates: [
      "VERIFY_WISHLIST_PRODUCT",
      "CREATE_OFFICIAL_AFFILIATE_LINK",
      "APPROVE_CREATIVE_AND_CAPTION",
      "PUBLISH_INSTAGRAM_POST",
      "ENROLL_POST_IN_AUTODM",
    ],
  };
}
