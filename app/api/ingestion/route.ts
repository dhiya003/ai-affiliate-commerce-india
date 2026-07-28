import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";
import {
  getIngestionStatistics,
  listSourceHealth,
} from "@/lib/ingestion/repository";
import { manualIngestionSchema } from "@/lib/ingestion/schema";
import { ingestManualProducts } from "@/lib/ingestion/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    await requireApiUser();
    const [sources, statistics] = await Promise.all([
      listSourceHealth(),
      getIngestionStatistics(),
    ]);
    return apiSuccess({ sources, statistics }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

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
        "Administrator access is required to trigger ingestion.",
      );
    }
    const input = await parseJsonBody(request, manualIngestionSchema);
    return apiSuccess(await ingestManualProducts(input, user.email), {
      requestId,
      status: 202,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
