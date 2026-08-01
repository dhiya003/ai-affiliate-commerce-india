import { redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getAdminOverview } from "@/lib/admin/repository";
import { getApplicationRole } from "@/lib/auth/roles";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const role = getApplicationRole(user);
  if (role !== "ADMIN") redirect("/unauthorized");
  const overview = await getAdminOverview({
    email: user.email,
    displayName: user.displayName,
    role,
  });
  return <AdminClient initialOverview={overview} currentEmail={user.email} />;
}
