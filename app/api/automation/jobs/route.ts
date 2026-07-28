import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import { listAutomationJobs } from "@/lib/automation/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    try {
      requireRole(user, ["ADMIN"]);
    } catch {
      throw new ApiError(
        403,
        "ADMIN_REQUIRED",
        "Administrator access is required to view automation jobs.",
      );
    }
    return apiSuccess(await listAutomationJobs(), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
