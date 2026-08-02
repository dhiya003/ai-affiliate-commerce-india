import { publishInstagramImage } from "./instagram.ts";
import {
  getMeeshoWorkflow,
  markMeeshoPublished,
  markMeeshoPublishFailed,
  markMeeshoPublishing,
} from "./workflow-repository";

export async function retryDueMeeshoPublications(
  db: D1Database,
  executionTime = new Date(),
) {
  const due = await db
    .prepare(
      `SELECT id, owner_email FROM meesho_creator_workflows
       WHERE status = 'RETRY_SCHEDULED' AND next_retry_at <= ?
       ORDER BY next_retry_at ASC LIMIT 20`,
    )
    .bind(executionTime.toISOString())
    .all<{ id: string; owner_email: string }>();
  const { env } = await import("cloudflare:workers");
  let succeeded = 0;
  let failed = 0;
  for (const row of due.results) {
    const workflow = await getMeeshoWorkflow(row.id, row.owner_email, db);
    if (!workflow?.caption || !workflow.creativePublicToken) {
      failed += 1;
      continue;
    }
    await markMeeshoPublishing(row.id, row.owner_email, db);
    try {
      const publicBaseUrl = env.APP_PUBLIC_URL?.trim();
      if (!publicBaseUrl?.startsWith("https://")) {
        throw new Error("An HTTPS APP_PUBLIC_URL is required.");
      }
      const result = await publishInstagramImage(
        {
          accessToken: env.META_ACCESS_TOKEN,
          businessAccountId: env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
          graphVersion: env.META_GRAPH_VERSION,
        },
        {
          imageUrl: `${publicBaseUrl}/api/meesho/workflows/${encodeURIComponent(workflow.id)}/creative?token=${encodeURIComponent(workflow.creativePublicToken)}`,
          caption: [workflow.caption, ...workflow.hashtags].join(" ").trim(),
        },
      );
      await markMeeshoPublished(row.id, row.owner_email, result, db);
      succeeded += 1;
    } catch (error) {
      await markMeeshoPublishFailed(row.id, row.owner_email, error, db);
      failed += 1;
    }
  }
  return { processed: due.results.length, succeeded, failed };
}
