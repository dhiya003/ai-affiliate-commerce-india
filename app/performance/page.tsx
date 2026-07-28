import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getPerformanceDashboard } from "@/lib/performance/repository";
import { PerformanceClient } from "./PerformanceClient";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const user = await requireChatGPTUser("/performance");
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60_000);
  const dashboard = await getPerformanceDashboard(user.email, {
    from: from.toISOString(),
    to: to.toISOString(),
  });
  return <PerformanceClient initialDashboard={dashboard} />;
}
