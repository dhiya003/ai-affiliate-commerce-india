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
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
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
    "storyFrames",
    "creativeImagePrompt",
    "landingPageHeadline",
    "landingPageBody",
    "landingPageBullets",
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
    storyFrames: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    creativeImagePrompt: { type: "string" },
    landingPageHeadline: { type: "string" },
    landingPageBody: { type: "string" },
    landingPageBullets: {
      type: "array",
      minItems: 3,
      maxItems: 6,
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

function localFallback(
  product: Product,
  provider: "built-in" | "built-in-fallback",
): ContentGenerationResult {
  return {
    content: generateLocalContent(product),
    promptVersion: CONTENT_PROMPT_VERSION,
    provider,
    providerModel: "affiliate-template-v1",
    requestId: null,
    usage: null,
  };
}

export async function generateContent(
  product: Product,
): Promise<ContentGenerationResult> {
  const { env } = await import("cloudflare:workers");
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return localFallback(product, "built-in");
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
  } catch {
    return localFallback(product, "built-in-fallback");
  }

  const payload = (await response.json()) as {
    id?: string;
    error?: { message?: string };
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };
  if (!response.ok) {
    if (
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500
    ) {
      return localFallback(product, "built-in-fallback");
    }
    throw new ApiError(
      502,
      "AI_PROVIDER_ERROR",
      "Content generation failed. Please try again.",
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

  const content =
    product.marketplace === "Meesho"
      ? {
          ...validated.data,
          caption: validated.data.caption
            .replace(/https?:\/\/\S+/gi, "")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\s*#ad\s*$/i, "")
            .concat(
              " Comment LINK and I’ll send the product details to your DM. Price and availability may change on Meesho. #ad",
            ),
          ctas: [
            "Comment LINK and I’ll send the product details to your DM.",
            ...validated.data.ctas.filter((cta) => !/link|url|bio/i.test(cta)),
          ].slice(0, 5),
          linkDelivery: "AUTODM" as const,
          autoDm: {
            enabled: true,
            triggerWords: ["LINK", "PRICE", "DETAILS", "DM"],
            commentCta:
              "Comment LINK and I’ll send the product details to your DM.",
            enrollmentRequired: true,
          },
          visualTemplate: {
            aspectRatio: "9:16" as const,
            productImagePercent: 60 as const,
            contentPercent: 40 as const,
            useVerifiedImageOnly: true as const,
          },
        }
      : validated.data;
  return {
    content,
    promptVersion: CONTENT_PROMPT_VERSION,
    provider: "openai",
    providerModel: model,
    requestId: payload.id ?? null,
    usage: payload.usage
      ? {
          inputTokens: payload.usage.input_tokens ?? 0,
          outputTokens: payload.usage.output_tokens ?? 0,
          totalTokens:
            payload.usage.total_tokens ??
            (payload.usage.input_tokens ?? 0) +
              (payload.usage.output_tokens ?? 0),
        }
      : null,
  };
}
