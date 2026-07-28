import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getApplicationRole } from "@/lib/auth/roles";
import { listExperiments } from "@/lib/experiments/repository";
import {
  listLearningProfiles,
  listRecommendationFeedback,
} from "@/lib/learning/repository";
import { listProducts } from "@/lib/products/repository";
import { ExperimentsClient } from "./ExperimentsClient";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const user = await requireChatGPTUser("/experiments");
  const [experiments, feedback, profiles, productsResult] = await Promise.all([
    listExperiments(user.email),
    listRecommendationFeedback(user.email),
    listLearningProfiles(user.email),
    listProducts(user.email, {
      sort: "score",
      page: 1,
      pageSize: 50,
    }),
  ]);

  return (
    <ExperimentsClient
      initialExperiments={experiments}
      initialFeedback={feedback}
      initialProfiles={profiles}
      isAdmin={getApplicationRole(user) === "ADMIN"}
      products={productsResult.products.map((product) => ({
        id: product.id,
        name: product.name,
        marketplace: product.marketplace,
        category: product.category,
      }))}
    />
  );
}
