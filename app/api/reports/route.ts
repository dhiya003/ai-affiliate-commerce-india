import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { generateReport, listReports } from "@/lib/notifications/reports";
import { reportGenerationSchema } from "@/lib/notifications/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    return apiSuccess(await listReports(user.email), { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, reportGenerationSchema);
    return apiSuccess(await generateReport(input, user.email), {
      requestId,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
