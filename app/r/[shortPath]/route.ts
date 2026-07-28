import { handleApiError } from "@/lib/api/errors";
import { recordTrackedClick } from "@/lib/tracking/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ shortPath: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const { shortPath } = await context.params;
    const result = await recordTrackedClick(shortPath, request);
    return new Response(null, {
      status: 302,
      headers: {
        location: result.destinationUrl,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
