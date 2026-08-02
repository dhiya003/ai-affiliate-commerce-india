interface AffinityImagesBinding {
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: {
        format: string;
        quality: number;
      }): Promise<{ response(): Response }>;
    };
  };
}

declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    IMAGES: AffinityImagesBinding;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    ERROR_MONITORING_WEBHOOK_URL?: string;
    ERROR_MONITORING_TOKEN?: string;
    NOTIFICATION_EMAIL_WEBHOOK_URL?: string;
    NOTIFICATION_EMAIL_TOKEN?: string;
    APP_PUBLIC_URL?: string;
    META_ACCESS_TOKEN?: string;
    INSTAGRAM_BUSINESS_ACCOUNT_ID?: string;
    META_GRAPH_VERSION?: string;
  }
}
