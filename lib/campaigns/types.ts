export type CampaignStatus =
  "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface CampaignSummary {
  id: string;
  name: string;
  objective: string;
  channel: string;
  startsAt: string | null;
  endsAt: string | null;
  budget: number | null;
  currency: string;
  status: CampaignStatus;
  notes: string | null;
  templateName: string | null;
  duplicatedFromId: string | null;
  archivedAt: string | null;
  promotionCount: number;
  publishedCount: number;
  createdAt: string;
  updatedAt: string;
}
