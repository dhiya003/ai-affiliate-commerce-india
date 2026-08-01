import { z } from "zod";

export const cronExpressionSchema = z
  .string()
  .trim()
  .refine((value) => {
    const parts = value.split(/\s+/);
    if (parts.length !== 5) return false;
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    return (
      /^(?:\*|[0-5]?\d)$/.test(minute!) &&
      /^(?:\*|[01]?\d|2[0-3])$/.test(hour!) &&
      dayOfMonth === "*" &&
      month === "*" &&
      /^(?:\*|[0-6])$/.test(dayOfWeek!)
    );
  }, "Use a supported five-field daily or weekly cron expression.");

function timezoneOffsetMilliseconds(timezone: string) {
  if (timezone === "UTC") return 0;
  if (timezone === "Asia/Kolkata") return 5.5 * 60 * 60_000;
  throw new Error("UNSUPPORTED_AUTOMATION_TIMEZONE");
}

export function nextCronOccurrence(
  expression: string,
  after = new Date(),
  timezone = "UTC",
): Date {
  const cron = cronExpressionSchema.parse(expression).split(/\s+/);
  const minute = cron[0] === "*" ? null : Number(cron[0]);
  const hour = cron[1] === "*" ? null : Number(cron[1]);
  const dayOfWeek = cron[4] === "*" ? null : Number(cron[4]);
  const offset = timezoneOffsetMilliseconds(timezone);
  const candidate = new Date(after.getTime() + 60_000);
  candidate.setUTCSeconds(0, 0);
  for (let index = 0; index < 8 * 24 * 60; index += 1) {
    const localCandidate = new Date(candidate.getTime() + offset);
    if (
      (minute == null || localCandidate.getUTCMinutes() === minute) &&
      (hour == null || localCandidate.getUTCHours() === hour) &&
      (dayOfWeek == null || localCandidate.getUTCDay() === dayOfWeek)
    ) {
      return candidate;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new Error("CRON_OCCURRENCE_NOT_FOUND");
}
