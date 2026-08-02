import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  getMeeshoReadinessDiagnostics,
  listMeeshoWorkflows,
} from "@/lib/meesho/workflow-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    return apiSuccess(
      getMeeshoReadinessDiagnostics(await listMeeshoWorkflows(user.email)),
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
