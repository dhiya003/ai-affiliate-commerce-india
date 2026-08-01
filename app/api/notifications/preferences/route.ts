import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  getNotificationPreference,
  updateNotificationPreference,
} from "@/lib/notifications/repository";
import { notificationPreferenceSchema } from "@/lib/notifications/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    return apiSuccess(await getNotificationPreference(user.email), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, notificationPreferenceSchema);
    return apiSuccess(await updateNotificationPreference(user.email, input), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
