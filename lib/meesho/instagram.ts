class InstagramPublishError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InstagramPublishError";
    this.code = code;
  }
}

export interface InstagramPublishingConfig {
  accessToken?: string;
  businessAccountId?: string;
  graphVersion?: string;
  fetcher?: typeof fetch;
}

export interface InstagramPublishResult {
  creationId: string;
  mediaId: string;
  permalink: string | null;
}

async function graphRequest<T>(
  url: string,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<T> {
  const response = await fetcher(url, init);
  const payload = (await response.json()) as T & {
    error?: { message?: string; code?: number };
  };
  if (!response.ok || payload.error) {
    throw new InstagramPublishError(
      payload.error?.code ? `META_${payload.error.code}` : "META_API_ERROR",
      payload.error?.message ?? "Instagram publishing failed.",
    );
  }
  return payload;
}

export async function publishInstagramImage(
  config: InstagramPublishingConfig,
  input: { imageUrl: string; caption: string },
): Promise<InstagramPublishResult> {
  const token = config.accessToken?.trim();
  const accountId = config.businessAccountId?.trim();
  if (!token || !accountId) {
    throw new InstagramPublishError(
      "INSTAGRAM_NOT_CONFIGURED",
      "Instagram publishing requires META_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.",
    );
  }
  const version = config.graphVersion?.trim() || "v23.0";
  const fetcher = config.fetcher ?? fetch;
  const base = `https://graph.facebook.com/${version}`;
  const container = await graphRequest<{ id: string }>(
    `${base}/${encodeURIComponent(accountId)}/media`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url: input.imageUrl,
        caption: input.caption,
        access_token: token,
      }),
    },
    fetcher,
  );
  const published = await graphRequest<{ id: string }>(
    `${base}/${encodeURIComponent(accountId)}/media_publish`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: token,
      }),
    },
    fetcher,
  );
  const details = await graphRequest<{ permalink?: string }>(
    `${base}/${encodeURIComponent(published.id)}?fields=permalink&access_token=${encodeURIComponent(token)}`,
    { method: "GET" },
    fetcher,
  );
  return {
    creationId: container.id,
    mediaId: published.id,
    permalink: details.permalink ?? null,
  };
}
