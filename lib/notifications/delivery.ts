export interface EmailNotificationPayload {
  recipientEmail: string;
  notificationId: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  actionUrl: string | null;
}

export type EmailDeliveryResult =
  | { status: "disabled" }
  | { status: "delivered"; externalMessageId?: string }
  | { status: "failed"; responseStatus?: number }
  | { status: "invalid_configuration" };

export async function deliverNotificationEmail(
  configuration: { endpoint?: string; token?: string },
  payload: EmailNotificationPayload,
  fetchImplementation: typeof fetch = fetch,
): Promise<EmailDeliveryResult> {
  if (!configuration.endpoint) return { status: "disabled" };
  let endpoint: URL;
  try {
    endpoint = new URL(configuration.endpoint);
  } catch {
    return { status: "invalid_configuration" };
  }
  if (endpoint.protocol !== "https:") {
    return { status: "invalid_configuration" };
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (configuration.token) {
    headers.authorization = `Bearer ${configuration.token}`;
  }
  try {
    const response = await fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok
      ? {
          status: "delivered",
          externalMessageId:
            response.headers.get("x-message-id")?.slice(0, 200) ?? undefined,
        }
      : { status: "failed", responseStatus: response.status };
  } catch {
    return { status: "failed" };
  }
}
