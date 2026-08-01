import { requireAdminApiUser } from "@/lib/admin/auth";
import { updateApplicationUser } from "@/lib/admin/repository";
import { applicationUserUpdateSchema } from "@/lib/admin/schema";
import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireAdminApiUser();
    const { email } = await params;
    const input = await parseJsonBody(request, applicationUserUpdateSchema);
    return apiSuccess(
      await updateApplicationUser(decodeURIComponent(email), input, user.email),
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
