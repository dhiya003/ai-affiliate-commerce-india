import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import { recalculateProductScore } from "@/lib/products/repository";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    return apiSuccess(await recalculateProductScore(id, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
