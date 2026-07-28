import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getApplicationRole } from "@/lib/auth/roles";
import { listPolicyKnowledgeBase } from "@/lib/policies/repository";
import { PolicyKnowledgeBaseClient } from "./PolicyKnowledgeBaseClient";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const user = await requireChatGPTUser("/policies");
  const knowledgeBase = await listPolicyKnowledgeBase();

  return (
    <PolicyKnowledgeBaseClient
      initialKnowledgeBase={knowledgeBase}
      role={getApplicationRole(user)}
    />
  );
}
