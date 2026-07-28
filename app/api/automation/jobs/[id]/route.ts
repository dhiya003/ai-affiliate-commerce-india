import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import { updateAutomationJob } from "@/lib/automation/repository";
import { automationJobUpdateSchema } from "@/lib/automation/schema";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    try {
      requireRole(user, ["ADMIN"]);
    } catch {
      throw new ApiError(
        403,
        "ADMIN_REQUIRED",
        "Administrator access is required to update automation jobs.",
      );
    }
    const { id } = await context.params;
    const input = await parseJsonBody(request, automationJobUpdateSchema);
    return apiSuccess(await updateAutomationJob(id, input), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
