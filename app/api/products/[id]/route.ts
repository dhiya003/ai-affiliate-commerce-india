import { handleApiError, ApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  deleteProduct,
  getProduct,
  getProductStatusHistory,
  updateProduct,
} from "@/lib/products/repository";
import { productUpdateSchema } from "@/lib/products/schema";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const product = await getProduct(id, user.email);
    if (!product) {
      throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
    }
    const statusHistory = await getProductStatusHistory(id);
    return apiSuccess({ product, statusHistory }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJsonBody(request, productUpdateSchema);
    return apiSuccess(await updateProduct(id, input, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    await deleteProduct(id, user.email);
    return apiSuccess({ deleted: true, id }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
