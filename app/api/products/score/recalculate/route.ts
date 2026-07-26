import { handleApiError } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  listProducts,
  recalculateProductScore,
} from "@/lib/products/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireApiUser();
    const listing = await listProducts(user.email, {
      sort: "score",
      page: 1,
      pageSize: 50,
    });
    const updated = [];
    const errors = [];

    for (const product of listing.products) {
      try {
        updated.push(await recalculateProductScore(product.id, user.email));
      } catch (error) {
        errors.push({
          productId: product.id,
          message:
            error instanceof Error ? error.message : "Recalculation failed.",
        });
      }
    }

    return apiSuccess(
      {
        updatedCount: updated.length,
        errorCount: errors.length,
        products: updated,
        errors,
      },
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
