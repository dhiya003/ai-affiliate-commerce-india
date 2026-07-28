import { logEvent } from "./logger";
import {
  deliverOperationalError,
  type OperationalErrorEvent,
} from "./monitoring";

export function captureOperationalError(event: OperationalErrorEvent): void {
  void import("cloudflare:workers")
    .then(({ env, waitUntil }) => {
      const delivery = deliverOperationalError(
        {
          endpoint: env.ERROR_MONITORING_WEBHOOK_URL?.trim(),
          token: env.ERROR_MONITORING_TOKEN?.trim(),
        },
        event,
      ).then((result) => {
        if (
          result.status === "failed" ||
          result.status === "invalid_configuration"
        ) {
          logEvent("warn", "monitoring.delivery.failed", {
            requestId: event.requestId,
            status:
              result.status === "failed" ? result.responseStatus : undefined,
            reason: result.status,
          });
        }
      });

      try {
        waitUntil(delivery);
      } catch {
        void delivery;
      }
    })
    .catch(() => {
      // Structured Worker logs remain the fallback monitoring destination.
    });
}
