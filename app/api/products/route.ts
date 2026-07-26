import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody, parseSearchParams } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { createProduct, listProducts } from "@/lib/products/repository";
import {
  productInputSchema,
  productListQuerySchema,
} from "@/lib/products/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const query = parseSearchParams(request, productListQuerySchema);
    return apiSuccess(await listProducts(user.email, query), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, productInputSchema);
    const product = await createProduct(input, user.email);
    return apiSuccess(product, { requestId, status: 201 });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
