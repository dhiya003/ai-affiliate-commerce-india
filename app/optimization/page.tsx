import { redirect } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getApplicationRole } from "@/lib/auth/roles";
import {
  listRecommendationQualitySnapshots,
  listScoringWeightVersions,
} from "@/lib/optimization/repository";
import { defaultScoringWeights } from "@/lib/optimization/schema";
import { OptimizationClient } from "./OptimizationClient";

export const dynamic = "force-dynamic";

export default async function OptimizationPage() {
  const user = await requireChatGPTUser("/optimization");
  if (getApplicationRole(user) !== "ADMIN") redirect("/unauthorized");
  const [versions, snapshots] = await Promise.all([
    listScoringWeightVersions(),
    listRecommendationQualitySnapshots(user.email),
  ]);
  const now = new Date();
  return (
    <OptimizationClient
      initialVersions={versions}
      initialSnapshots={snapshots}
      defaultWeights={defaultScoringWeights}
      defaultRange={{
        from: new Date(now.getTime() - 90 * 24 * 60 * 60_000)
          .toISOString()
          .slice(0, 10),
        to: now.toISOString().slice(0, 10),
      }}
    />
  );
}
