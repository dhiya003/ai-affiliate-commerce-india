import { ApiError } from "@/lib/api/errors";
import { getProduct } from "@/lib/products/repository";

async function database(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "Saved-product storage is unavailable.",
    );
  }
  return env.DB;
}

export async function listSavedProducts(email: string) {
  const rows = await (
    await database()
  )
    .prepare(
      `SELECT product_id, created_at FROM saved_products
       WHERE user_email = ? ORDER BY created_at DESC LIMIT 100`,
    )
    .bind(email)
    .all<{ product_id: string; created_at: string }>();
  const products = await Promise.all(
    rows.results.map(async (row) => ({
      product: await getProduct(row.product_id, email),
      savedAt: row.created_at,
    })),
  );
  return products.filter(
    (
      item,
    ): item is {
      product: NonNullable<(typeof item)["product"]>;
      savedAt: string;
    } => item.product !== null,
  );
}

export async function saveProduct(productId: string, email: string) {
  const product = await getProduct(productId, email);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }
  const savedAt = new Date().toISOString();
  await (
    await database()
  )
    .prepare(
      `INSERT INTO saved_products (id, product_id, user_email, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_email, product_id) DO NOTHING`,
    )
    .bind(crypto.randomUUID(), productId, email, savedAt)
    .run();
  return { product, savedAt };
}

export async function removeSavedProduct(productId: string, email: string) {
  await (
    await database()
  )
    .prepare(
      "DELETE FROM saved_products WHERE product_id = ? AND user_email = ?",
    )
    .bind(productId, email)
    .run();
}
