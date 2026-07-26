import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import { generateContent } from "@/lib/content/provider";
import {
  getLatestContent,
  saveGeneratedContent,
} from "@/lib/content/repository";
import { getProduct } from "@/lib/products/repository";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function visibleProduct(id: string, email: string) {
  const product = await getProduct(id, email);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  return product;
}

export async function GET(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    await visibleProduct(id, user.email);
    return apiSuccess(await getLatestContent(id, user.email), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const product = await visibleProduct(id, user.email);
    const generation = await generateContent(product);
    const saved = await saveGeneratedContent(id, user.email, generation);
    return apiSuccess(saved, { requestId, status: 201 });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
