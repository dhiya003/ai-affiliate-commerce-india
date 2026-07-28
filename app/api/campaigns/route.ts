import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody, parseSearchParams } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { createCampaign, listCampaigns } from "@/lib/campaigns/repository";
import {
  campaignInputSchema,
  campaignQuerySchema,
} from "@/lib/campaigns/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const query = parseSearchParams(request, campaignQuerySchema);
    return apiSuccess(await listCampaigns(user.email, query), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, campaignInputSchema);
    return apiSuccess(await createCampaign(input, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
