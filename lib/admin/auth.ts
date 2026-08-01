import { ApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/api-user";
import { requireRole } from "@/lib/auth/roles";

export async function requireAdminApiUser() {
  const user = await requireApiUser();
  try {
    requireRole(user, ["ADMIN"]);
  } catch {
    throw new ApiError(
      403,
      "ADMIN_REQUIRED",
      "Administrator access is required.",
    );
  }
  return user;
}
