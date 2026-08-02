import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { importMeeshoWishlistCsv } from "@/lib/meesho/workflow-repository";
import { meeshoBulkWishlistImportSchema } from "@/lib/meesho/workflow-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const input = await parseJsonBody(request, meeshoBulkWishlistImportSchema);
    return apiSuccess(await importMeeshoWishlistCsv(user.email, input.csv), {
      requestId,
      status: 202,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
