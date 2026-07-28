export interface OperationalErrorEvent {
  code?: string;
  errorType?: string;
  event: string;
  requestId: string;
  status: number;
}

export interface MonitoringConfiguration {
  endpoint?: string;
  token?: string;
}

export type MonitoringDeliveryResult =
  | { status: "disabled" }
  | { status: "delivered" }
  | { status: "failed"; responseStatus?: number }
  | { status: "invalid_configuration" };

function httpsEndpoint(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function deliverOperationalError(
  configuration: MonitoringConfiguration,
  event: OperationalErrorEvent,
  fetchImplementation: typeof fetch = fetch,
): Promise<MonitoringDeliveryResult> {
  if (!configuration.endpoint) return { status: "disabled" };

  const endpoint = httpsEndpoint(configuration.endpoint);
  if (!endpoint) return { status: "invalid_configuration" };

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
      body: JSON.stringify({
        occurredAt: new Date().toISOString(),
        environment: "production",
        ...event,
      }),
      signal: AbortSignal.timeout(3_000),
    });

    return response.ok
      ? { status: "delivered" }
      : { status: "failed", responseStatus: response.status };
  } catch {
    return { status: "failed" };
  }
}

export const monitoringInternals = { httpsEndpoint };
