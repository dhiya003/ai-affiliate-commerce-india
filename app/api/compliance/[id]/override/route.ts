import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import { overrideComplianceCheck } from "@/lib/compliance/repository";
import { complianceOverrideSchema } from "@/lib/compliance/schema";

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
        "Administrator access is required to override compliance.",
      );
    }
    const { id } = await context.params;
    const { reason } = await parseJsonBody(request, complianceOverrideSchema);
    return apiSuccess(await overrideComplianceCheck(id, reason, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
