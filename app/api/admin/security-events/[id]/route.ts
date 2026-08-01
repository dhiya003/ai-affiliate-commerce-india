import { requireAdminApiUser } from "@/lib/admin/auth";
import { resolveSecurityEvent } from "@/lib/admin/repository";
import { securityEventActionSchema } from "@/lib/admin/schema";
import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireAdminApiUser();
    const { id } = await params;
    await parseJsonBody(request, securityEventActionSchema);
    return apiSuccess(await resolveSecurityEvent(id, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
