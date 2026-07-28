import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  createContentVariation,
  listContentVariations,
} from "@/lib/experiments/repository";
import { contentVariationInputSchema } from "@/lib/experiments/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const productId = new URL(request.url).searchParams
      .get("productId")
      ?.trim();
    if (!productId) {
      return apiSuccess([], { requestId });
    }
    return apiSuccess(await listContentVariations(productId, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, contentVariationInputSchema);
    return apiSuccess(await createContentVariation(input, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
