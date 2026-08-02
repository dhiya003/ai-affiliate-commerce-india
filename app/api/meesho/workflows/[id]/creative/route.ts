import {
  buildMeeshoCreativeSvg,
  fetchImageAsDataUrl,
} from "@/lib/meesho/creative";
import { getPublicMeeshoWorkflow } from "@/lib/meesho/workflow-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const token = new URL(request.url).searchParams.get("token");
  const { id } = await context.params;
  if (!token) return new Response("Not found", { status: 404 });
  const workflow = await getPublicMeeshoWorkflow(token);
  if (!workflow || workflow.id !== id || !workflow.creativeRenderedAt) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const imageDataUrl = await fetchImageAsDataUrl(workflow.imageUrl);
    const svg = buildMeeshoCreativeSvg(workflow, imageDataUrl);
    const { env } = await import("cloudflare:workers");
    if (env.IMAGES) {
      const transformed = await env.IMAGES.input(
        new Response(svg, { headers: { "content-type": "image/svg+xml" } })
          .body!,
      )
        .transform({ width: 1080, height: 1920, fit: "cover" })
        .output({ format: "image/jpeg", quality: 90 });
      const response = transformed.response();
      return new Response(response.body, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Creative unavailable", { status: 502 });
  }
}
