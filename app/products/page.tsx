import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { listProductCategories, listProducts } from "@/lib/products/repository";
import { ProductCatalogClient } from "./ProductCatalogClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await requireChatGPTUser("/products");
  const [initialResult, initialCategories] = await Promise.all([
    listProducts(user.email, {
      sort: "score",
      page: 1,
      pageSize: 12,
    }),
    listProductCategories(user.email),
  ]);

  return (
    <ProductCatalogClient
      initialResult={initialResult}
      initialCategories={initialCategories}
      userName={user.displayName}
    />
  );
}
