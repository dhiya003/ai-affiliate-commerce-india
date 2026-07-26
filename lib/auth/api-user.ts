import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { ApiError } from "@/lib/api/errors";

export async function requireApiUser(): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (!user) {
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  }
  return user;
}
