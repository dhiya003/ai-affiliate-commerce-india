import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import { getMeeshoWorkflow } from "@/lib/meesho/workflow-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const workflow = await getMeeshoWorkflow(id, user.email);
    if (!workflow) {
      throw new ApiError(
        404,
        "WORKFLOW_NOT_FOUND",
        "Meesho workflow not found.",
      );
    }
    return apiSuccess(workflow, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
