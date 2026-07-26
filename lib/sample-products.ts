import { calculateOpportunityScore } from "@/lib/scoring";

const sourceProducts = [
  {
    id: "amazon-earbuds",
    name: "Noise Air Buds Pro SE",
    marketplace: "Amazon",
    category: "Electronics",
    price: 1299,
    originalPrice: 2999,
    rating: 4.6,
    reviews: 12430,
    commissionRate: 8,
    sellerRating: 4.8,
    returnRisk: "LOW" as const,
    trendScore: 91,
    competitionScore: 72,
    demandScore: 89,
    accent: "violet",
    status: "New",
  },
  {
    id: "myntra-kurta",
    name: "Anouk Floral Cotton Kurta",
    marketplace: "Myntra",
    category: "Fashion",
    price: 799,
    originalPrice: 1999,
    rating: 4.5,
    reviews: 8421,
    commissionRate: 11,
    sellerRating: 4.7,
    returnRisk: "MEDIUM" as const,
    trendScore: 88,
    competitionScore: 77,
    demandScore: 86,
    accent: "rose",
    status: "Approved",
  },
  {
    id: "meesho-chopper",
    name: "SwiftCut Handy Chopper",
    marketplace: "Meesho",
    category: "Home & Kitchen",
    price: 299,
    originalPrice: 699,
    rating: 4.4,
    reviews: 18950,
    commissionRate: 9,
    sellerRating: 4.5,
    returnRisk: "LOW" as const,
    trendScore: 94,
    competitionScore: 69,
    demandScore: 93,
    accent: "amber",
    status: "Reviewed",
  },
  {
    id: "flipkart-serum",
    name: "Minimalist Vitamin C Serum",
    marketplace: "Flipkart",
    category: "Beauty",
    price: 549,
    originalPrice: 799,
    rating: 4.7,
    reviews: 6312,
    commissionRate: 10,
    sellerRating: 4.9,
    returnRisk: "LOW" as const,
    trendScore: 86,
    competitionScore: 81,
    demandScore: 84,
    accent: "cyan",
    status: "New",
  },
  {
    id: "ajio-handbag",
    name: "DNMX Structured Handbag",
    marketplace: "AJIO",
    category: "Accessories",
    price: 899,
    originalPrice: 2499,
    rating: 4.3,
    reviews: 2789,
    commissionRate: 13,
    sellerRating: 4.6,
    returnRisk: "MEDIUM" as const,
    trendScore: 82,
    competitionScore: 84,
    demandScore: 79,
    accent: "blue",
    status: "New",
  },
  {
    id: "amazon-bands",
    name: "Boldfit Resistance Band Kit",
    marketplace: "Amazon",
    category: "Fitness",
    price: 499,
    originalPrice: 999,
    rating: 4.6,
    reviews: 9874,
    commissionRate: 7,
    sellerRating: 4.8,
    returnRisk: "LOW" as const,
    trendScore: 79,
    competitionScore: 73,
    demandScore: 81,
    accent: "lime",
    status: "Promoted",
  },
] as const;

export interface DashboardProduct {
  id: string;
  name: string;
  marketplace: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  commissionRate: number;
  sellerRating: number;
  returnRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  trendScore: number;
  competitionScore: number;
  demandScore: number;
  accent: string;
  status: string;
  opportunityScore: number;
  commissionEstimate: number;
  discount: number;
  strongestFactors: string[];
}

export function getSampleProducts(): DashboardProduct[] {
  return sourceProducts
    .map((product) => {
      const score = calculateOpportunityScore({
        productId: product.id,
        rating: product.rating,
        reviewCount: product.reviews,
        currentPrice: product.price,
        originalPrice: product.originalPrice,
        commissionRate: product.commissionRate,
        sellerRating: product.sellerRating,
        returnRisk: product.returnRisk,
        trendScore: product.trendScore,
        competitionScore: product.competitionScore,
        demandScore: product.demandScore,
      });

      return {
        ...product,
        opportunityScore: score.opportunityScore,
        commissionEstimate: score.commissionEstimate,
        discount: Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        ),
        strongestFactors: score.explanation.strongestFactors,
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}
