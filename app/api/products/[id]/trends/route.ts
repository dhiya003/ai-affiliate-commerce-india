import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import {
  listProductTrendSignals,
  recordProductTrendSignals,
} from "@/lib/trends/repository";
import { trendSignalsSchema } from "@/lib/trends/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    return apiSuccess(await listProductTrendSignals(id, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

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
        "Administrator access is required to record trend evidence.",
      );
    }
    const { id } = await context.params;
    const signals = await parseJsonBody(request, trendSignalsSchema);
    return apiSuccess(
      await recordProductTrendSignals(id, signals, user.email),
      { requestId, status: 201 },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
