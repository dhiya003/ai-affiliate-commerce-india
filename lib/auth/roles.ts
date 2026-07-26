import type { ChatGPTUser } from "@/app/chatgpt-auth";

export type ApplicationRole = "ADMIN" | "USER";

export function getApplicationRole(user: ChatGPTUser): ApplicationRole {
  const administrators = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return administrators.includes(user.email.toLowerCase()) ? "ADMIN" : "USER";
}

export function requireRole(
  user: ChatGPTUser,
  allowedRoles: ApplicationRole[],
): ApplicationRole {
  const role = getApplicationRole(user);

  if (!allowedRoles.includes(role)) {
    throw new Error("UNAUTHORIZED_ROLE");
  }

  return role;
}
