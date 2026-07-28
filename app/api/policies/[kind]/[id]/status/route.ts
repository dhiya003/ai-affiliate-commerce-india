import { handleApiError, ApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import { updatePolicyStatus } from "@/lib/policies/repository";
import { policyKind, policyStatusInputSchema } from "@/lib/policies/schema";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
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
        "Administrator access is required to review policies.",
      );
    }
    const { kind, id } = await context.params;
    const input = await parseJsonBody(request, policyStatusInputSchema);
    return apiSuccess(
      await updatePolicyStatus(policyKind(kind), id, input.status, user.email),
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
