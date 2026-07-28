import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { createPromotionWithTrackedLink } from "@/lib/tracking/repository";
import { promotionInputSchema } from "@/lib/tracking/schema";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJsonBody(request, promotionInputSchema);
    return apiSuccess(
      await createPromotionWithTrackedLink(id, input, user.email),
      { requestId, status: 201 },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
