import { redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getApplicationRole } from "@/lib/auth/roles";
import { listAutomationJobs } from "@/lib/automation/repository";
import { AutomationClient } from "./AutomationClient";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await requireChatGPTUser("/automation");
  if (getApplicationRole(user) !== "ADMIN") redirect("/unauthorized");
  return <AutomationClient initialJobs={await listAutomationJobs()} />;
}
