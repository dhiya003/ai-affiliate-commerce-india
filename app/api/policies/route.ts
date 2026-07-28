import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseSearchParams } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { listPolicyKnowledgeBase } from "@/lib/policies/repository";
import { policyListQuerySchema } from "@/lib/policies/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await requireApiUser();
    const query = parseSearchParams(request, policyListQuerySchema);
    return apiSuccess(await listPolicyKnowledgeBase(query), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
