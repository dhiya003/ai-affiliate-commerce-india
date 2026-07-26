import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { listProducts } from "@/lib/products/repository";
import { ProductCatalogClient } from "./ProductCatalogClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await requireChatGPTUser("/products");
  const initialResult = await listProducts(user.email, {
    sort: "score",
    page: 1,
    pageSize: 12,
  });

  return (
    <ProductCatalogClient
      initialResult={initialResult}
      userName={user.displayName}
    />
  );
}
