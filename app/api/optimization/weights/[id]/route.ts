import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import {
  activateScoringWeightVersion,
  rollbackScoringWeightVersion,
} from "@/lib/optimization/repository";
import { scoringWeightActionSchema } from "@/lib/optimization/schema";

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
        "Administrator access is required to change the active scoring version.",
      );
    }
    const { id } = await context.params;
    const input = await parseJsonBody(request, scoringWeightActionSchema);
    const result =
      input.action === "activate"
        ? await activateScoringWeightVersion(id, user.email)
        : await rollbackScoringWeightVersion(id, user.email);
    return apiSuccess(result, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
