import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import { listNotifications } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const unreadOnly = new URL(request.url).searchParams.get("unread") === "1";
    return apiSuccess(await listNotifications(user.email, { unreadOnly }), {
      requestId,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
