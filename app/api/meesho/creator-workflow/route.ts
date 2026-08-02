import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  buildMeeshoCreatorHandoff,
  meeshoWishlistCandidateSchema,
} from "@/lib/meesho/creator-workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await requireApiUser();
    const candidate = await parseJsonBody(
      request,
      meeshoWishlistCandidateSchema,
    );
    return apiSuccess(buildMeeshoCreatorHandoff(candidate), {
      requestId,
      status: 202,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
