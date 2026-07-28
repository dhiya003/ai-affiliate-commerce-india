export type TrackingDeviceType =
  "MOBILE" | "TABLET" | "DESKTOP" | "OTHER" | "UNKNOWN";

const botPattern =
  /bot|crawler|spider|preview|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|headless/i;

export function classifyDevice(userAgent: string): TrackingDeviceType {
  if (!userAgent) return "UNKNOWN";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "TABLET";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "MOBILE";
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return "DESKTOP";
  return "OTHER";
}

export function isLikelyBot(userAgent: string): boolean {
  return !userAgent || botPattern.test(userAgent);
}

export function safeTrafficSource(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.hostname.toLowerCase().slice(0, 160)
      : null;
  } catch {
    return null;
  }
}
