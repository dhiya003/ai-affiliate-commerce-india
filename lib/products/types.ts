import type { ProductScoreResult } from "@/lib/scoring";

export const MARKETPLACES = [
  "Amazon",
  "Flipkart",
  "Meesho",
  "Myntra",
  "AJIO",
] as const;

export const PRODUCT_STATUSES = [
  "NEW",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
  "PROMOTED",
] as const;

export const STOCK_STATUSES = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "UNKNOWN",
] as const;

export const RETURN_RISKS = ["LOW", "MEDIUM", "HIGH", "UNKNOWN"] as const;

export type MarketplaceName = (typeof MARKETPLACES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type StockStatus = (typeof STOCK_STATUSES)[number];
export type ReturnRisk = (typeof RETURN_RISKS)[number];

export interface Product {
  id: string;
  ownerEmail: string | null;
  marketplace: MarketplaceName;
  marketplaceProductId: string;
  name: string;
  description: string | null;
  productUrl: string;
  affiliateUrl: string | null;
  imageUrl: string | null;
  category: string;
  sellerName: string | null;
  currentPrice: number;
  originalPrice: number | null;
  rating: number | null;
  reviewCount: number;
  commissionRate: number | null;
  sellerRating: number | null;
  stockStatus: StockStatus;
  returnRisk: ReturnRisk;
  status: ProductStatus;
  notes: string | null;
  tags: string[];
  opportunityScore: number | null;
  score: ProductScoreResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStatusEvent {
  id: string;
  productId: string;
  changedByEmail: string;
  fromStatus: ProductStatus | null;
  toStatus: ProductStatus;
  note: string | null;
  changedAt: string;
}

export interface ProductListResult {
  products: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
