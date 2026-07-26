import {
  PrismaClient,
  ProductWorkflowStatus,
  ReturnRisk,
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
