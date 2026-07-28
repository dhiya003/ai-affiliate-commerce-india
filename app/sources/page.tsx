import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getApplicationRole } from "@/lib/auth/roles";
import {
  getIngestionStatistics,
  listSourceHealth,
} from "@/lib/ingestion/repository";
import { SourceOperationsClient } from "./SourceOperationsClient";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const user = await requireChatGPTUser("/sources");
  const [sources, statistics] = await Promise.all([
    listSourceHealth(),
    getIngestionStatistics(),
  ]);

  return (
    <SourceOperationsClient
      initialSources={sources}
      initialStatistics={statistics}
      role={getApplicationRole(user)}
    />
  );
}
