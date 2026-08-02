import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  listMeeshoWorkflows,
  summarizeMeeshoWorkflows,
} from "@/lib/meesho/workflow-repository";
import { MeeshoWorkflowClient } from "./MeeshoWorkflowClient";

export const dynamic = "force-dynamic";

export default async function MeeshoWorkflowPage() {
  const user = await requireChatGPTUser("/meesho");
  const workflows = await listMeeshoWorkflows(user.email);
  return (
    <MeeshoWorkflowClient
      initialWorkflows={workflows}
      initialSummary={summarizeMeeshoWorkflows(workflows)}
    />
  );
}
