import { ApiError } from "@/lib/api/errors";
import type { Product } from "@/lib/products/types";
import { generateLocalContent } from "./local-generator";
import {
  buildContentPrompt,
  CONTENT_PROMPT_VERSION,
  CONTENT_SYSTEM_INSTRUCTIONS,
} from "./prompts";
import { extractOutputText } from "./response";
import { contentBundleSchema, type ContentBundle } from "./schema";

const DEFAULT_MODEL = "gpt-5.6-sol";

export interface ContentGenerationResult {
  content: ContentBundle;
  promptVersion: string;
  provider: string;
  providerModel: string;
  requestId: string | null;
}

const contentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "whyPromote",
    "targetAudiences",
    "reelHooks",
    "reelScript30",
    "reelScript60",
    "caption",
    "hashtags",
    "ctas",
    "thumbnailTexts",
    "pros",
    "cautions",
    "affiliateDisclosure",
  ],
  properties: {
    summary: { type: "string" },
    whyPromote: { type: "string" },
    targetAudiences: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
    reelHooks: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    reelScript30: { type: "string" },
    reelScript60: { type: "string" },
    caption: { type: "string" },
    hashtags: {
      type: "array",
      minItems: 6,
      maxItems: 20,
      items: { type: "string" },
    },
    ctas: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    thumbnailTexts: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    pros: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    cautions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    affiliateDisclosure: { type: "string" },
  },
} as const;

export async function generateContent(
  product: Product,
): Promise<ContentGenerationResult> {
  const { env } = await import("cloudflare:workers");
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return {
      content: generateLocalContent(product),
      promptVersion: CONTENT_PROMPT_VERSION,
      provider: "built-in",
      providerModel: "affiliate-template-v1",
      requestId: null,
    };
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: CONTENT_SYSTEM_INSTRUCTIONS,
        input: buildContentPrompt(product),
        text: {
          format: {
            type: "json_schema",
            name: "affiliate_content_bundle",
            strict: true,
            schema: contentJsonSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });
  } catch (error) {
    throw new ApiError(
      502,
      "AI_PROVIDER_UNAVAILABLE",
      error instanceof Error && error.name === "TimeoutError"
        ? "Content generation timed out. Please try again."
        : "The AI provider is temporarily unavailable.",
    );
  }

  const payload = (await response.json()) as {
    id?: string;
    error?: { message?: string };
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (!response.ok) {
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      response.status === 429 ? "AI_RATE_LIMITED" : "AI_PROVIDER_ERROR",
      response.status === 429
        ? "The content generator is busy. Please retry shortly."
        : "Content generation failed. Please try again.",
    );
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new ApiError(
      502,
      "AI_EMPTY_RESPONSE",
      "The content generator returned no usable content.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new ApiError(
      502,
      "AI_INVALID_RESPONSE",
      "The content generator returned an invalid response.",
    );
  }

  const validated = contentBundleSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ApiError(
      502,
      "AI_INVALID_RESPONSE",
      "The generated content did not pass quality validation.",
    );
  }

  return {
    content: validated.data,
    promptVersion: CONTENT_PROMPT_VERSION,
    provider: "openai",
    providerModel: model,
    requestId: payload.id ?? null,
  };
}
