import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { markAllNotificationsRead } from "@/lib/notifications/repository";
import { notificationBulkActionSchema } from "@/lib/notifications/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    await parseJsonBody(request, notificationBulkActionSchema);
    return apiSuccess(await markAllNotificationsRead(user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
