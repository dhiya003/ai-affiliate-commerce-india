export type LogLevel = "info" | "warn" | "error";

type LogValue = string | number | boolean | null;
type LogContext = Record<string, LogValue | undefined>;

const sensitiveKeyPattern =
  /authorization|cookie|email|name|token|secret|password|key|prompt|content|url/i;

function safeContext(context: LogContext): Record<string, LogValue> {
  return Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) => {
      if (value === undefined || sensitiveKeyPattern.test(key)) return [];
      if (typeof value === "string" && value.length > 240) {
        return [[key, `${value.slice(0, 237)}…`]];
      }
      return [[key, value]];
    }),
  );
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeContext(context),
  });

  if (level === "error") {
    console.error(record);
  } else if (level === "warn") {
    console.warn(record);
  } else {
    console.info(record);
  }
}

export const loggerInternals = { safeContext };
