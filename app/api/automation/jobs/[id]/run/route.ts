import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import { runAutomationJob } from "@/lib/automation/repository";
import { automationRunActionSchema } from "@/lib/automation/schema";

export const dynamic = "force-dynamic";

export async function POST(
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
        "Administrator access is required to rerun automation jobs.",
      );
    }
    await parseJsonBody(request, automationRunActionSchema);
    const { id } = await context.params;
    return apiSuccess(await runAutomationJob(id, "MANUAL", user.email), {
      requestId,
      status: 202,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
