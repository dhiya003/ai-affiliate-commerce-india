import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import {
  createScoringWeightDraft,
  listScoringWeightVersions,
} from "@/lib/optimization/repository";
import { scoringWeightDraftSchema } from "@/lib/optimization/schema";

export const dynamic = "force-dynamic";

function requireAdministrator(
  user: Awaited<ReturnType<typeof requireApiUser>>,
) {
  try {
    requireRole(user, ["ADMIN"]);
  } catch {
    throw new ApiError(
      403,
      "ADMIN_REQUIRED",
      "Administrator access is required to manage scoring weights.",
    );
  }
}

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    requireAdministrator(user);
    return apiSuccess(await listScoringWeightVersions(), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    requireAdministrator(user);
    const input = await parseJsonBody(request, scoringWeightDraftSchema);
    return apiSuccess(await createScoringWeightDraft(input, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
