import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { listCampaigns } from "@/lib/campaigns/repository";
import { CampaignsClient } from "./CampaignsClient";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await requireChatGPTUser("/campaigns");
  const campaigns = await listCampaigns(user.email, {
    q: "",
    includeArchived: false,
  });

  return <CampaignsClient initialCampaigns={campaigns} />;
}
