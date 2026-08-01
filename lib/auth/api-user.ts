import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { ApiError } from "@/lib/api/errors";
import { getApplicationRole } from "@/lib/auth/roles";

export async function requireApiUser(): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) {
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  }
  const { ensureApplicationUserAccess } =
    await import("@/lib/admin/repository");
  await ensureApplicationUserAccess(
    user.email,
    user.displayName,
    getApplicationRole(user),
  );
  return user;
}
