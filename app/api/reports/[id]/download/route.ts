import { handleApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/api-user";
import { downloadReport } from "@/lib/notifications/reports";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const report = await downloadReport(id, user.email);
    return new Response(report.body, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="${report.filename}"`,
        "content-type": report.contentType,
        "x-content-type-options": "nosniff",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
