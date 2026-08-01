import { requireAdminApiUser } from "@/lib/admin/auth";
import { recordRestoreTest, requestBackup } from "@/lib/admin/repository";
import { backupActionSchema } from "@/lib/admin/schema";
import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireAdminApiUser();
    const input = await parseJsonBody(request, backupActionSchema);
    const result =
      input.action === "request"
        ? await requestBackup(user.email)
        : await recordRestoreTest(input.backupRunId, user.email);
    return apiSuccess(result, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
