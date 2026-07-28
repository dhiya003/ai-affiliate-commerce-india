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
  }, "Use a supported five-field daily or weekly UTC cron expression.");

export function nextCronOccurrence(
  expression: string,
  after = new Date(),
): Date {
  const cron = cronExpressionSchema.parse(expression).split(/\s+/);
  const minute = cron[0] === "*" ? null : Number(cron[0]);
  const hour = cron[1] === "*" ? null : Number(cron[1]);
  const dayOfWeek = cron[4] === "*" ? null : Number(cron[4]);
  const candidate = new Date(after.getTime() + 60_000);
  candidate.setUTCSeconds(0, 0);
  for (let index = 0; index < 8 * 24 * 60; index += 1) {
    if (
      (minute == null || candidate.getUTCMinutes() === minute) &&
      (hour == null || candidate.getUTCHours() === hour) &&
      (dayOfWeek == null || candidate.getUTCDay() === dayOfWeek)
    ) {
      return candidate;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new Error("CRON_OCCURRENCE_NOT_FOUND");
}
