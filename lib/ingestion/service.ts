import type { ManualIngestionInput } from "./schema.ts";
import { adapterForManualInput } from "./normalizer.ts";
import { executeIngestionRun } from "./repository.ts";

export async function ingestManualProducts(
  input: ManualIngestionInput,
  email: string,
) {
  const adapter = adapterForManualInput(input);
  return executeIngestionRun({
    sourceId: input.sourceId,
    marketplace: input.marketplace,
    products: input.records.map((record) => adapter.normalize(record)),
    rawRecords: input.records,
    email,
    triggerType: "MANUAL",
  });
}
