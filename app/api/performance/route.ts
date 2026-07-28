import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseSearchParams } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { getPerformanceDashboard } from "@/lib/performance/repository";
import { performanceQuerySchema } from "@/lib/performance/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const range = parseSearchParams(request, performanceQuerySchema);
    return apiSuccess(await getPerformanceDashboard(user.email, range), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
