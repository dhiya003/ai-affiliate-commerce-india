import type { NotificationPreference } from "./types.ts";

const INDIA_OFFSET_MS = 5.5 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

export type SummaryReportType =
  "DAILY_OPPORTUNITY" | "WEEKLY_PERFORMANCE" | "MONTHLY_EARNINGS";

export type SummaryNotificationType =
  | "DAILY_OPPORTUNITY_SUMMARY"
  | "WEEKLY_PERFORMANCE_SUMMARY"
  | "MONTHLY_EARNINGS_SUMMARY";

export interface SummaryPeriod {
  frequency: Exclude<NotificationPreference["digestFrequency"], "NONE">;
  reportType: SummaryReportType;
  notificationType: SummaryNotificationType;
  key: string;
  from: string;
  to: string;
}

function indiaCalendarDate(now: Date) {
  return new Date(now.getTime() + INDIA_OFFSET_MS);
}

function indiaMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day) - INDIA_OFFSET_MS);
}

function indiaDateKey(date: Date, length = 10) {
  return indiaCalendarDate(date).toISOString().slice(0, length);
}

function closedPeriod(from: Date, exclusiveTo: Date) {
  return {
    from: from.toISOString(),
    to: new Date(exclusiveTo.getTime() - 1).toISOString(),
  };
}

/**
 * Returns only summaries whose completed India-time calendar period is due.
 * Daily opportunity summaries cover today, weekly summaries cover the previous
 * Monday-Sunday and are due on Monday, and monthly summaries cover the
 * previous calendar month and are due on the first day of the month.
 */
export function dueSummaryPeriods(now = new Date()): SummaryPeriod[] {
  const india = indiaCalendarDate(now);
  const year = india.getUTCFullYear();
  const month = india.getUTCMonth();
  const day = india.getUTCDate();
  const todayStart = indiaMidnightUtc(year, month, day);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const daily = closedPeriod(todayStart, tomorrowStart);
  const periods: SummaryPeriod[] = [
    {
      frequency: "DAILY",
      reportType: "DAILY_OPPORTUNITY",
      notificationType: "DAILY_OPPORTUNITY_SUMMARY",
      key: indiaDateKey(todayStart),
      ...daily,
    },
  ];

  if (india.getUTCDay() === 1) {
    const previousMonday = new Date(todayStart.getTime() - 7 * DAY_MS);
    periods.push({
      frequency: "WEEKLY",
      reportType: "WEEKLY_PERFORMANCE",
      notificationType: "WEEKLY_PERFORMANCE_SUMMARY",
      key: indiaDateKey(previousMonday),
      ...closedPeriod(previousMonday, todayStart),
    });
  }

  if (day === 1) {
    const currentMonthStart = indiaMidnightUtc(year, month, 1);
    const previousMonthStart = indiaMidnightUtc(year, month - 1, 1);
    periods.push({
      frequency: "MONTHLY",
      reportType: "MONTHLY_EARNINGS",
      notificationType: "MONTHLY_EARNINGS_SUMMARY",
      key: indiaDateKey(previousMonthStart, 7),
      ...closedPeriod(previousMonthStart, currentMonthStart),
    });
  }

  return periods;
}

export function reportPeriodForFrequency(
  frequency: NotificationPreference["digestFrequency"],
  now = new Date(),
) {
  if (frequency === "NONE") return null;
  return (
    dueSummaryPeriods(now).find((period) => period.frequency === frequency) ??
    null
  );
}
