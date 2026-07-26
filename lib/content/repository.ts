import { ApiError } from "@/lib/api/errors";
import type { ContentGenerationResult } from "./provider";
import { contentBundleSchema, type GeneratedContent } from "./schema";

interface ContentRow {
  id: string;
  product_id: string;
  content_json: string;
  prompt_version: string;
  provider: string;
  provider_model: string;
  request_id: string | null;
  created_at: string;
}

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Content storage is unavailable.",
    );
  }
  return env.DB;
}

function mapContent(row: ContentRow): GeneratedContent {
  return {
    id: row.id,
    productId: row.product_id,
    content: contentBundleSchema.parse(JSON.parse(row.content_json)),
    promptVersion: row.prompt_version,
    provider: row.provider,
    providerModel: row.provider_model,
    requestId: row.request_id,
    createdAt: row.created_at,
  };
}

export async function getLatestContent(
  productId: string,
  email: string,
): Promise<GeneratedContent | null> {
  const row = await (
    await database()
  )
    .prepare(
      `SELECT id, product_id, content_json, prompt_version, provider,
        provider_model, request_id, created_at
       FROM generated_content
       WHERE product_id = ? AND created_by_email = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(productId, email)
    .first<ContentRow>();
  return row ? mapContent(row) : null;
}

export async function saveGeneratedContent(
  productId: string,
  email: string,
  generation: ContentGenerationResult,
): Promise<GeneratedContent> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await (
    await database()
  )
    .prepare(
      `INSERT INTO generated_content (
        id, product_id, created_by_email, content_json, prompt_version,
        provider, provider_model, request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      productId,
      email,
      JSON.stringify(generation.content),
      generation.promptVersion,
      generation.provider,
      generation.providerModel,
      generation.requestId,
      createdAt,
    )
    .run();

  return {
    id,
    productId,
    content: generation.content,
    promptVersion: generation.promptVersion,
    provider: generation.provider,
    providerModel: generation.providerModel,
    requestId: generation.requestId,
    createdAt,
  };
}
