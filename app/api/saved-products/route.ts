import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  listSavedProducts,
  removeSavedProduct,
  saveProduct,
} from "@/lib/saved-products/repository";
import { savedProductInputSchema } from "@/lib/saved-products/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    return apiSuccess(await listSavedProducts(user.email), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { productId } = await parseJsonBody(request, savedProductInputSchema);
    return apiSuccess(await saveProduct(productId, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { productId } = await parseJsonBody(request, savedProductInputSchema);
    await removeSavedProduct(productId, user.email);
    return apiSuccess({ removed: true }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
