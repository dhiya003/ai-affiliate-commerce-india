import { ApiError, handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { publishInstagramImage } from "@/lib/meesho/instagram";
import {
  approveMeeshoWorkflow,
  confirmMeeshoAutoDm,
  getMeeshoWorkflow,
  markMeeshoPublished,
  markMeeshoPublishFailed,
  markMeeshoPublishing,
  recordMeeshoEnrollmentFailure,
  recordMeeshoAffiliateLink,
  recordMeeshoCreative,
  retryMeeshoEnrollment,
} from "@/lib/meesho/workflow-repository";
import { meeshoWorkflowActionSchema } from "@/lib/meesho/workflow-schema";
import { createNotification } from "@/lib/notifications/repository";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const input = await parseJsonBody(request, meeshoWorkflowActionSchema);
    if (input.action === "record-affiliate-link") {
      return apiSuccess(
        await recordMeeshoAffiliateLink(id, user.email, input.affiliateUrl),
        { requestId },
      );
    }
    if (input.action === "render-creative") {
      return apiSuccess(await recordMeeshoCreative(id, user.email, input), {
        requestId,
      });
    }
    if (input.action === "approve") {
      return apiSuccess(await approveMeeshoWorkflow(id, user.email), {
        requestId,
      });
    }
    if (input.action === "confirm-autodm") {
      return apiSuccess(
        await confirmMeeshoAutoDm(id, user.email, input.triggerWords),
        { requestId },
      );
    }
    if (input.action === "record-enrollment-failure") {
      return apiSuccess(
        await recordMeeshoEnrollmentFailure(
          id,
          user.email,
          input.errorCode,
          input.errorMessage,
        ),
        { requestId, status: 202 },
      );
    }
    if (input.action === "retry-enrollment") {
      return apiSuccess(await retryMeeshoEnrollment(id, user.email), {
        requestId,
      });
    }

    const workflow = await getMeeshoWorkflow(id, user.email);
    if (!workflow) {
      throw new ApiError(
        404,
        "WORKFLOW_NOT_FOUND",
        "Meesho workflow not found.",
      );
    }
    if (!workflow.caption || !workflow.creativePublicToken) {
      throw new ApiError(
        409,
        "CREATIVE_NOT_READY",
        "Render and approve the creative before publishing.",
      );
    }
    const { env } = await import("cloudflare:workers");
    const publicBaseUrl =
      env.APP_PUBLIC_URL?.trim() || new URL(request.url).origin;
    if (!publicBaseUrl.startsWith("https://")) {
      throw new ApiError(
        503,
        "PUBLIC_URL_REQUIRED",
        "Instagram publishing requires an HTTPS APP_PUBLIC_URL.",
      );
    }
    await markMeeshoPublishing(id, user.email);
    try {
      const imageUrl = `${publicBaseUrl}/api/meesho/workflows/${encodeURIComponent(id)}/creative?token=${encodeURIComponent(workflow.creativePublicToken)}`;
      const caption = [workflow.caption, ...workflow.hashtags].join(" ").trim();
      const published = await publishInstagramImage(
        {
          accessToken: env.META_ACCESS_TOKEN,
          businessAccountId: env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
          graphVersion: env.META_GRAPH_VERSION,
        },
        { imageUrl, caption },
      );
      return apiSuccess(await markMeeshoPublished(id, user.email, published), {
        requestId,
      });
    } catch (error) {
      const failed = await markMeeshoPublishFailed(id, user.email, error);
      await createNotification(user.email, {
        type: "CREATOR_WORKFLOW_FAILURE",
        severity: failed.status === "FAILED" ? "CRITICAL" : "WARNING",
        title:
          failed.status === "FAILED"
            ? "Instagram publishing failed"
            : "Instagram publishing retry scheduled",
        body: `${failed.title}: ${failed.lastErrorMessage ?? "Publishing failed."}`,
        actionUrl: "/meesho",
        entityType: "MEESHO_CREATOR_WORKFLOW",
        entityId: failed.id,
        dedupeKey: `meesho-publish-${failed.id}-${failed.publishAttemptCount}`,
        metadata: {
          status: failed.status,
          attempt: failed.publishAttemptCount,
          errorCode: failed.lastErrorCode,
        },
      });
      return apiSuccess(failed, { requestId, status: 202 });
    }
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
