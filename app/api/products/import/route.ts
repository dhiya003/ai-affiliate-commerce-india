import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { requireApiUser } from "@/lib/auth/api-user";
import { parseProductCsv } from "@/lib/products/csv";
import { createProduct } from "@/lib/products/repository";
import { csvImportInputSchema } from "@/lib/products/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const { csv } = await parseJsonBody(request, csvImportInputSchema);
    const parsed = parseProductCsv(csv);
    const imported = [];
    const errors = [...parsed.errors];

    for (const [index, product] of parsed.valid.entries()) {
      try {
        imported.push(await createProduct(product, user.email));
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : "Import failed.",
        });
      }
    }

    return apiSuccess(
      {
        imported,
        importedCount: imported.length,
        errorCount: errors.length,
        errors,
      },
      { requestId, status: imported.length > 0 ? 201 : 200 },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
