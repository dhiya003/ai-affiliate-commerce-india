import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getApplicationRole } from "@/lib/auth/roles";
import { getSampleProducts } from "@/lib/sample-products";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireChatGPTUser("/dashboard");
  const role = getApplicationRole(user);

  return (
    <DashboardClient
      products={getSampleProducts()}
      user={{
        displayName: user.displayName,
        email: user.email,
        role,
      }}
    />
  );
}
