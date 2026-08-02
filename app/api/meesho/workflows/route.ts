import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  createMeeshoWorkflow,
  listMeeshoWorkflows,
  summarizeMeeshoWorkflows,
} from "@/lib/meesho/workflow-repository";
import { meeshoWorkflowImportSchema } from "@/lib/meesho/workflow-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const workflows = await listMeeshoWorkflows(user.email);
    return apiSuccess(
      { workflows, summary: summarizeMeeshoWorkflows(workflows) },
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, meeshoWorkflowImportSchema);
    return apiSuccess(await createMeeshoWorkflow(user.email, input), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
