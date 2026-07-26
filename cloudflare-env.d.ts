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
  }
}
