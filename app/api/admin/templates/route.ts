import { requireAdminApiUser } from "@/lib/admin/auth";
import { createManagedTemplate } from "@/lib/admin/repository";
import { managedTemplateInputSchema } from "@/lib/admin/schema";
import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireAdminApiUser();
    const input = await parseJsonBody(request, managedTemplateInputSchema);
    return apiSuccess(await createManagedTemplate(input, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
