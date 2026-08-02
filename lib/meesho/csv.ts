export function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const [header = [], ...body] = rows;
  return body.map((cells) =>
    Object.fromEntries(
      header.map((name, index) => [
        name.trim().toLowerCase(),
        cells[index] ?? "",
      ]),
    ),
  );
}

function numberValue(value: string | undefined) {
  const parsed = Number((value ?? "").replace(/[₹,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function value(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const found = row[name.toLowerCase()];
    if (found) return found;
  }
  return "";
}

export function parseMeeshoWishlistCsv(csv: string) {
  return parseCsvRows(csv).map((row) => ({
    productId: value(row, ["product_id", "productid"]) || null,
    productUrl: value(row, ["product_url", "producturl", "url"]),
    title: value(row, ["title", "product_title", "name"]),
    imageUrl: value(row, ["image_url", "imageurl", "image"]),
    category: value(row, ["category"]),
    price: numberValue(value(row, ["price", "current_price"])),
    originalPrice: numberValue(value(row, ["original_price", "mrp"])) || null,
    supplierName: value(row, ["supplier", "supplier_name"]) || null,
    observedAt:
      value(row, ["observed_at", "observedat"]) || new Date().toISOString(),
    affiliateUrl: value(row, ["affiliate_url", "affiliateurl"]) || null,
  }));
}

export function parseMeeshoAutoDmReportCsv(csv: string) {
  return parseCsvRows(csv).map((row) => ({
    workflowId: value(row, ["workflow_id", "workflowid", "id"]) || null,
    productUrl: value(row, ["product_url", "producturl", "url"]) || null,
    delivered: numberValue(value(row, ["delivered", "delivered_count"])),
    opened: numberValue(value(row, ["opened", "open_count"])),
    clicked: numberValue(value(row, ["clicked", "click_count"])),
    conversions: numberValue(value(row, ["conversions", "conversion_count"])),
    revenue: numberValue(value(row, ["revenue"])),
    commission: numberValue(value(row, ["commission"])),
    sourceRow: row,
  }));
}
