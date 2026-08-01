import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import { generateNotificationAlerts } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    return apiSuccess(await generateNotificationAlerts(user.email), {
      requestId,
      status: 202,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
