import { getAdminOverview } from "@/lib/admin/repository";
import { requireAdminApiUser } from "@/lib/admin/auth";
import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { getApplicationRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireAdminApiUser();
    return apiSuccess(
      await getAdminOverview({
        email: user.email,
        displayName: user.displayName,
        role: getApplicationRole(user),
      }),
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
