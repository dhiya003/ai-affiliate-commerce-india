import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getProduct, getProductStatusHistory } from "@/lib/products/repository";
import { ProductDetailClient } from "./ProductDetailClient";

export const dynamic = "force-dynamic";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProtectedProductDetail paramsPromise={params} />;
}

async function ProtectedProductDetail({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  const user = await requireChatGPTUser(`/products/${encodeURIComponent(id)}`);
  const product = await getProduct(id, user.email);
  if (!product) notFound();
  const statusHistory = await getProductStatusHistory(id);

  return (
    <ProductDetailClient
      initialProduct={product}
      initialStatusHistory={statusHistory}
      userEmail={user.email}
    />
  );
}
