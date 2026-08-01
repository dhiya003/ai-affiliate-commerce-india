import type { AttributionImport } from "./schema.ts";

type AttributionRecord = AttributionImport["records"][number];

function identity(record: AttributionRecord) {
  return `${record.trackingId}\u0000${record.externalOrderId}`;
}

function conversionState(record: AttributionRecord) {
  return JSON.stringify({
    orderStatus: record.orderStatus,
    orderValue: record.orderValue,
    currency: record.currency,
  });
}

function commissionTime(record: AttributionRecord) {
  return record.commission ? Date.parse(record.commission.observedAt) : 0;
}

/**
 * Removes exact provider duplicates, rejects contradictory observations at the
 * same timestamp, and orders lifecycle evidence so the newest conversion state
 * is applied last. Raw order identifiers remain in memory only.
 */
export function reconcileAttributionRecords(
  records: AttributionImport["records"],
) {
  const seenRecords = new Set<string>();
  const statesAtTime = new Map<string, string>();
  const reconciled: AttributionRecord[] = [];
  let duplicatesRemoved = 0;

  for (const record of records) {
    const signature = JSON.stringify(record);
    if (seenRecords.has(signature)) {
      duplicatesRemoved += 1;
      continue;
    }
    seenRecords.add(signature);
    const stateKey = `${identity(record)}\u0000${record.convertedAt}`;
    const state = conversionState(record);
    const previous = statesAtTime.get(stateKey);
    if (previous && previous !== state) {
      throw new Error("CONFLICTING_ATTRIBUTION_OBSERVATION");
    }
    statesAtTime.set(stateKey, state);
    reconciled.push(record);
  }

  reconciled.sort((left, right) => {
    const identityOrder = identity(left).localeCompare(identity(right));
    if (identityOrder) return identityOrder;
    const conversionOrder =
      Date.parse(left.convertedAt) - Date.parse(right.convertedAt);
    return conversionOrder || commissionTime(left) - commissionTime(right);
  });
  return {
    records: reconciled,
    duplicatesRemoved,
    reconciledOrders: new Set(reconciled.map(identity)).size,
  };
}
