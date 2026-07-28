import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  getLatestComplianceCheck,
  runComplianceCheck,
} from "@/lib/compliance/repository";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    return apiSuccess(await getLatestComplianceCheck(id, user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    return apiSuccess(await runComplianceCheck(id, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
