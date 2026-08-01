import { requireAdminApiUser } from "@/lib/admin/auth";
import { updateFeatureFlag } from "@/lib/admin/repository";
import { featureFlagUpdateSchema } from "@/lib/admin/schema";
import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireAdminApiUser();
    const { key } = await params;
    const input = await parseJsonBody(request, featureFlagUpdateSchema);
    return apiSuccess(await updateFeatureFlag(key, input, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
