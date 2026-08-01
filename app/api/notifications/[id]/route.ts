import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { setNotificationReadState } from "@/lib/notifications/repository";
import { notificationReadSchema } from "@/lib/notifications/schema";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const input = await parseJsonBody(request, notificationReadSchema);
    return apiSuccess(
      await setNotificationReadState(id, user.email, input.action === "read"),
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
