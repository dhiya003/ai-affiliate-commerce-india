import {
  PolicySeverity,
  PolicyStatus,
  PrismaClient,
  ProductWorkflowStatus,
  ReturnRisk,
  SourceType,
  StockStatus,
  UserRole,
} from "@prisma/client";
import { categories, marketplaces, productTemplates } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@affinity.local" },
    update: { role: UserRole.ADMIN },
    create: {
      email: "admin@affinity.local",
      name: "Affinity Administrator",
      role: UserRole.ADMIN,
    },
  });

  const marketplaceRecords = await Promise.all(
    marketplaces.map((marketplace) =>
      prisma.marketplace.upsert({
        where: { slug: marketplace.slug },
        update: marketplace,
        create: marketplace,
      }),
    ),
  );

  const categoryRecords = await Promise.all(
    categories.map(([name, slug]) =>
      prisma.productCategory.upsert({
        where: { slug },
        update: { name },
        create: { name, slug },
      }),
    ),
  );

  const categoryBySlug = new Map(
    categoryRecords.map((category) => [category.slug, category]),
  );
  const marketplaceBySlug = new Map(
    marketplaceRecords.map((marketplace) => [marketplace.slug, marketplace]),
  );

  for (const marketplace of marketplaceRecords) {
    const source = await prisma.productSource.upsert({
      where: {
        marketplaceId_name: {
          marketplaceId: marketplace.id,
          name: `${marketplace.name} operator import`,
        },
      },
      update: {
        sourceType: SourceType.MANUAL,
        freshnessWindowMinutes: 720,
      },
      create: {
        marketplaceId: marketplace.id,
        name: `${marketplace.name} operator import`,
        sourceType: SourceType.MANUAL,
        freshnessWindowMinutes: 720,
      },
    });

    await prisma.ingestionSchedule.upsert({
      where: { sourceId: source.id },
      update: { cadenceMinutes: 720 },
      create: {
        sourceId: source.id,
        cadenceMinutes: 720,
        enabled: false,
      },
    });
  }

  for (const [marketplaceIndex, marketplace] of marketplaceRecords.entries()) {
    const seller = await prisma.seller.upsert({
      where: {
        marketplaceId_externalId: {
          marketplaceId: marketplace.id,
          externalId: `sample-seller-${marketplace.slug}`,
        },
      },
      update: {},
      create: {
        marketplaceId: marketplace.id,
        externalId: `sample-seller-${marketplace.slug}`,
        name: `${marketplace.name} Sample Seller`,
        rating: 4.2 + marketplaceIndex * 0.1,
        isVerified: true,
      },
    });

    for (const [templateIndex, template] of productTemplates.entries()) {
      const [baseName, categorySlug, basePrice, originalPrice] = template;
      const productNumber =
        marketplaceIndex * productTemplates.length + templateIndex + 1;
      const marketplaceProductId = `${marketplace.slug.toUpperCase()}-${String(productNumber).padStart(3, "0")}`;
      const currentPrice =
        basePrice + marketplaceIndex * 30 + templateIndex * 7;
      const rating = Math.min(4.9, 3.9 + ((productNumber * 7) % 10) / 10);
      const reviewCount = 180 + productNumber * 137;
      const opportunityScore = 58 + ((productNumber * 11) % 39);
      const discountScore = Math.round(
        ((originalPrice - currentPrice) / originalPrice) * 100,
      );

      const product = await prisma.product.upsert({
        where: {
          marketplaceId_marketplaceProductId: {
            marketplaceId: marketplace.id,
            marketplaceProductId,
          },
        },
        update: {},
        create: {
          marketplaceId: marketplace.id,
          marketplaceProductId,
          sellerId: seller.id,
          categoryId: categoryBySlug.get(categorySlug)?.id,
          createdById: admin.id,
          name: `${baseName} — ${marketplace.name}`,
          description: `Seeded ${baseName.toLowerCase()} opportunity for Phase 1 product workflows.`,
          productUrl: `${marketplace.baseUrl}/sample/${marketplaceProductId.toLowerCase()}`,
          imageUrl: `https://placehold.co/800x800/f6f3ee/1f2937?text=${encodeURIComponent(baseName)}`,
          currentPrice,
          originalPrice,
          rating,
          reviewCount,
          commissionRate: 4 + (productNumber % 9),
          stockStatus:
            productNumber % 11 === 0
              ? StockStatus.LOW_STOCK
              : StockStatus.IN_STOCK,
          returnRisk:
            productNumber % 7 === 0 ? ReturnRisk.MEDIUM : ReturnRisk.LOW,
          status:
            productNumber % 8 === 0
              ? ProductWorkflowStatus.REVIEWED
              : ProductWorkflowStatus.NEW,
        },
      });

      const capturedAt = new Date(Date.UTC(2026, 6, 26, 0, productNumber, 0));

      await prisma.productPriceHistory.upsert({
        where: {
          productId_capturedAt: {
            productId: product.id,
            capturedAt,
          },
        },
        update: {},
        create: {
          productId: product.id,
          price: currentPrice,
          originalPrice,
          inStock: true,
          capturedAt,
        },
      });

      const scoreExists = await prisma.productScore.findFirst({
        where: {
          productId: product.id,
          version: "v1.0.0-seed",
          calculatedAt: capturedAt,
        },
        select: { id: true },
      });

      if (!scoreExists) {
        await prisma.productScore.create({
          data: {
            productId: product.id,
            version: "v1.0.0-seed",
            opportunityScore,
            ratingScore: Math.round(rating * 20),
            reviewVolumeScore: Math.min(100, Math.round(reviewCount / 60)),
            discountScore,
            commissionScore: 50 + (productNumber % 9) * 5,
            priceAttractivenessScore: currentPrice < 1000 ? 88 : 72,
            sellerQualityScore: 86 + marketplaceIndex * 2,
            competitionScore: 55 + ((productNumber * 3) % 35),
            trendScore: 50,
            demandScore: 50,
            returnRiskPenalty: productNumber % 7 === 0 ? 12 : 3,
            commissionEstimate:
              currentPrice * ((4 + (productNumber % 9)) / 100),
            explanation: {
              summary: "Seed score for Phase 1 demonstration and testing.",
              strongestFactor: rating >= 4.5 ? "rating" : "priceAttractiveness",
              caveat: "Trend and demand are placeholders until Phase 2.",
            },
            calculatedAt: capturedAt,
          },
        });
      }
    }
  }

  const reviewedAt = new Date("2026-07-29T00:00:00.000Z");
  const policyRules = [
    {
      slug: "amazon",
      title: "Associates operating agreement",
      summary:
        "Use Special Links and Amazon-provided content only within the Associates agreement and applicable operating documentation.",
      ruleType: "AFFILIATE_REQUIREMENT",
      effectiveAt: new Date("2021-11-01T00:00:00.000Z"),
      sourceUrl: "https://affiliate-program.amazon.in/help/operating/agreement",
      status: PolicyStatus.ACTIVE,
    },
    {
      slug: "flipkart",
      title: "Affiliate operating agreement",
      summary:
        "Participation requires acceptance into the program and use of approved referral links.",
      ruleType: "AFFILIATE_REQUIREMENT",
      effectiveAt: new Date("2024-10-18T00:00:00.000Z"),
      sourceUrl: "https://affiliate.flipkart.com/terms-and-conditions",
      status: PolicyStatus.ACTIVE,
    },
    {
      slug: "meesho",
      title: "Reelz Deals affiliate workflow",
      summary:
        "Opted-in products may be selected for social or storefront content using trackable product links.",
      ruleType: "CREATOR_REQUIREMENT",
      effectiveAt: new Date("2026-05-18T00:00:00.000Z"),
      sourceUrl: "https://www.meesho.com/legal/influencer-marketing-tncs",
      status: PolicyStatus.ACTIVE,
    },
    {
      slug: "myntra",
      title: "Meta affiliate product tagging",
      summary:
        "Creator eligibility and account-level terms must be confirmed before using the announced Meta product-tagging route.",
      ruleType: "CREATOR_REQUIREMENT",
      effectiveAt: new Date("2026-06-09T00:00:00.000Z"),
      sourceUrl:
        "https://stories.flipkart.com/announcement/flipkart-group-launches-meta-affiliate-partnerships-to-power-india-s-creator-commerce-revolution",
      status: PolicyStatus.NEEDS_REVIEW,
    },
    {
      slug: "ajio",
      title: "Affiliate option requires verification",
      summary:
        "Confirm an approved partner route before generating or publishing affiliate links.",
      ruleType: "AFFILIATE_AVAILABILITY",
      effectiveAt: reviewedAt,
      sourceUrl: "https://www.ajio.com/help/termsAndCondition",
      status: PolicyStatus.NEEDS_REVIEW,
    },
  ];

  for (const rule of policyRules) {
    const marketplace = marketplaceBySlug.get(rule.slug);
    if (!marketplace) continue;
    await prisma.marketplaceRule.upsert({
      where: {
        marketplaceId_title: {
          marketplaceId: marketplace.id,
          title: rule.title,
        },
      },
      update: {
        summary: rule.summary,
        ruleType: rule.ruleType,
        effectiveAt: rule.effectiveAt,
        sourceUrl: rule.sourceUrl,
        status: rule.status,
      },
      create: {
        marketplaceId: marketplace.id,
        title: rule.title,
        summary: rule.summary,
        ruleType: rule.ruleType,
        effectiveAt: rule.effectiveAt,
        sourceUrl: rule.sourceUrl,
        status: rule.status,
        reviewedAt:
          rule.status === PolicyStatus.ACTIVE ? reviewedAt : undefined,
        reviewedByEmail:
          rule.status === PolicyStatus.ACTIVE
            ? "system@affinity.local"
            : undefined,
      },
    });
  }

  const amazon = marketplaceBySlug.get("amazon");
  const flipkart = marketplaceBySlug.get("flipkart");
  const myntra = marketplaceBySlug.get("myntra");
  if (amazon) {
    const amazonCommissionEffectiveAt = new Date("2026-07-01T00:00:00.000Z");
    await prisma.commissionRule.upsert({
      where: {
        marketplaceId_category_effectiveAt: {
          marketplaceId: amazon.id,
          category: "Apparel & Beauty",
          effectiveAt: amazonCommissionEffectiveAt,
        },
      },
      update: { rateMin: 10, rateMax: 10, status: PolicyStatus.ACTIVE },
      create: {
        marketplaceId: amazon.id,
        title: "Apparel and beauty advertising rate",
        summary:
          "The official July 2026 schedule lists a fixed 10 percent rate.",
        category: "Apparel & Beauty",
        rateMin: 10,
        rateMax: 10,
        effectiveAt: amazonCommissionEffectiveAt,
        sourceUrl:
          "https://affiliate-program.amazon.in/help/node/topic/GRXPHT8U84RAYDXZ",
        status: PolicyStatus.ACTIVE,
        reviewedAt,
        reviewedByEmail: "system@affinity.local",
      },
    });
    await prisma.contentPolicy.upsert({
      where: {
        marketplaceId_title: {
          marketplaceId: amazon.id,
          title: "Social affiliate disclosure",
        },
      },
      update: { status: PolicyStatus.ACTIVE },
      create: {
        marketplaceId: amazon.id,
        title: "Social affiliate disclosure",
        summary:
          "Each social affiliate post needs a clear, conspicuous disclosure near its link.",
        channel: "SOCIAL_MEDIA",
        effectiveAt: new Date("2021-11-01T00:00:00.000Z"),
        sourceUrl:
          "https://affiliate-program.amazon.in/help/node/topic/GPXFHVYZMTGPUMPE",
        status: PolicyStatus.ACTIVE,
        reviewedAt,
        reviewedByEmail: "system@affinity.local",
      },
    });
    await prisma.affiliateDisclosure.upsert({
      where: {
        marketplaceId_title: {
          marketplaceId: amazon.id,
          title: "Amazon Associate identification",
        },
      },
      update: { status: PolicyStatus.ACTIVE },
      create: {
        marketplaceId: amazon.id,
        title: "Amazon Associate identification",
        summary:
          "Use the required Associate identification and a link-level disclosure.",
        disclosureText:
          "As an Amazon Associate I earn from qualifying purchases.",
        placement:
          "Clearly on the site and near each affiliate link or product review.",
        effectiveAt: new Date("2021-11-01T00:00:00.000Z"),
        sourceUrl:
          "https://affiliate-program.amazon.in/help/node/topic/GPXFHVYZMTGPUMPE",
        status: PolicyStatus.ACTIVE,
        reviewedAt,
        reviewedByEmail: "system@affinity.local",
      },
    });
    await prisma.prohibitedPractice.upsert({
      where: {
        marketplaceId_title: {
          marketplaceId: amazon.id,
          title: "Incentivising use of affiliate links",
        },
      },
      update: { status: PolicyStatus.ACTIVE },
      create: {
        marketplaceId: amazon.id,
        title: "Incentivising use of affiliate links",
        summary:
          "Do not offer rewards or incentives for using Associates links.",
        severity: PolicySeverity.BLOCKING,
        effectiveAt: new Date("2021-11-01T00:00:00.000Z"),
        sourceUrl:
          "https://affiliate-program.amazon.in/help/node/topic/G8TW5AE9XL2VX9VM",
        status: PolicyStatus.ACTIVE,
        reviewedAt,
        reviewedByEmail: "system@affinity.local",
      },
    });
  }

  if (flipkart) {
    await prisma.commissionRule.upsert({
      where: {
        marketplaceId_category_effectiveAt: {
          marketplaceId: flipkart.id,
          category: "Books & General Merchandise",
          effectiveAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      },
      update: { rateMin: 5, rateMax: 5, status: PolicyStatus.ACTIVE },
      create: {
        marketplaceId: flipkart.id,
        title: "Books and general merchandise referral rate",
        summary: "The official July 2026 payout table lists a 5 percent rate.",
        category: "Books & General Merchandise",
        rateMin: 5,
        rateMax: 5,
        effectiveAt: new Date("2026-07-01T00:00:00.000Z"),
        sourceUrl: "https://affiliate.flipkart.com/commissions",
        status: PolicyStatus.ACTIVE,
        reviewedAt,
        reviewedByEmail: "system@affinity.local",
      },
    });
  }

  if (myntra) {
    await prisma.platformUpdateHistory.upsert({
      where: { id: "seed-myntra-meta-affiliate-2026-06-09" },
      update: {},
      create: {
        id: "seed-myntra-meta-affiliate-2026-06-09",
        marketplaceId: myntra.id,
        policyKind: "MARKETPLACE_RULE",
        changeType: "PROGRAM_ANNOUNCED",
        nextStatus: PolicyStatus.NEEDS_REVIEW,
        summary:
          "Flipkart Group announced Meta affiliate product tagging for Flipkart and Myntra.",
        sourceUrl:
          "https://stories.flipkart.com/announcement/flipkart-group-launches-meta-affiliate-partnerships-to-power-india-s-creator-commerce-revolution",
        detectedAt: new Date("2026-06-09T00:00:00.000Z"),
      },
    });
  }

  const productCount = await prisma.product.count();
  console.info(
    `Seed complete: ${marketplaceRecords.length} marketplaces, ${categoryRecords.length} categories, ${productCount} products.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
