import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import { importAttributionEvents } from "@/lib/performance/repository";
import { attributionImportSchema } from "@/lib/performance/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    try {
      requireRole(user, ["ADMIN"]);
    } catch {
      throw new ApiError(
        403,
        "ADMIN_REQUIRED",
        "Administrator access is required to import attribution events.",
      );
    }
    const input = await parseJsonBody(request, attributionImportSchema);
    return apiSuccess(await importAttributionEvents(input, user.email), {
      requestId,
      status: 202,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
