import type { NotificationType } from "./schema";

export interface NotificationPreference {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  digestFrequency: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  enabledTypes: NotificationType[];
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  updatedAt: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  body: string;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  delivery: {
    inApp: string | null;
    email: string | null;
  };
}

export interface GeneratedReport {
  id: string;
  type: "DAILY_OPPORTUNITY" | "WEEKLY_PERFORMANCE" | "MONTHLY_EARNINGS";
  title: string;
  periodFrom: string;
  periodTo: string;
  status: "READY" | "EXPIRED";
  format: "CSV" | "JSON";
  rowCount: number;
  generatedAt: string;
  expiresAt: string;
}
