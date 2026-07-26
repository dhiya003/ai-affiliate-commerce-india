import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { changeProductStatus } from "@/lib/products/repository";
import { productStatusInputSchema } from "@/lib/products/schema";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJsonBody(request, productStatusInputSchema);
    return apiSuccess(
      await changeProductStatus(
        id,
        input.status,
        input.note ?? null,
        user.email,
      ),
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
