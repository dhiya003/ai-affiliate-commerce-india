export interface PerformanceBreakdown {
  key: string;
  label: string;
  clicks: number;
  conversions: number;
  commission: number;
}

export interface PerformanceDashboard {
  range: { from: string; to: string };
  summary: {
    totalClicks: number;
    totalConversions: number;
    totalCommission: number;
    conversionRate: number;
    earningsPerClick: number;
    clickThroughRate: null;
    clickThroughRateReason: string;
  };
  byMarketplace: PerformanceBreakdown[];
  byCampaign: PerformanceBreakdown[];
  byProduct: PerformanceBreakdown[];
  daily: PerformanceBreakdown[];
}
