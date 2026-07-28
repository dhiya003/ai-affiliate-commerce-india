import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  archiveExperiment,
  calculateExperimentResults,
  selectExperimentWinner,
  startExperiment,
} from "@/lib/experiments/repository";
import { experimentActionSchema } from "@/lib/experiments/schema";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJsonBody(request, experimentActionSchema);
    const experiment =
      input.action === "start"
        ? await startExperiment(id, user.email)
        : input.action === "calculate"
          ? await calculateExperimentResults(id, user.email)
          : input.action === "select-winner"
            ? await selectExperimentWinner(id, input.variationId, user.email)
            : await archiveExperiment(id, user.email);
    return apiSuccess(experiment, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
