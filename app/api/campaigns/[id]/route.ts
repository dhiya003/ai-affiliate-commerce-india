import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { archiveCampaign, duplicateCampaign } from "@/lib/campaigns/repository";
import { campaignActionSchema } from "@/lib/campaigns/schema";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJsonBody(request, campaignActionSchema);
    const campaign =
      input.action === "duplicate"
        ? await duplicateCampaign(id, user.email)
        : await archiveCampaign(id, user.email);
    return apiSuccess(campaign, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
