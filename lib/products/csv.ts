import { z } from "zod";
import { productInputSchema, type ProductInput } from "./schema.ts";

export interface CsvImportResult {
  valid: ProductInput[];
  errors: Array<{
    row: number;
    message: string;
  }>;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);

  if (quoted) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  return rows;
}

function numberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function valueFor(
  headers: string[],
  cells: string[],
  name: string,
): string | undefined {
  const index = headers.indexOf(name);
  return index === -1 ? undefined : cells[index];
}

export function parseProductCsv(csv: string): CsvImportResult {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) {
    return {
      valid: [],
      errors: [{ row: 1, message: "CSV must include a header and data row." }],
    };
  }

  const headers = rows[0]!.map((header) =>
    header
      .trim()
      .replace(/^\uFEFF/, "")
      .toLowerCase(),
  );
  const required = [
    "marketplace",
    "marketplaceproductid",
    "name",
    "producturl",
    "category",
    "currentprice",
  ];
  const missing = required.filter((header) => !headers.includes(header));

  if (missing.length > 0) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          message: `Missing required columns: ${missing.join(", ")}.`,
        },
      ],
    };
  }

  const valid: ProductInput[] = [];
  const errors: CsvImportResult["errors"] = [];

  for (const [rowIndex, cells] of rows.slice(1, 101).entries()) {
    const tags = (valueFor(headers, cells, "tags") ?? "")
      .split("|")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const candidate = {
      marketplace: valueFor(headers, cells, "marketplace"),
      marketplaceProductId: valueFor(headers, cells, "marketplaceproductid"),
      name: valueFor(headers, cells, "name"),
      description: valueFor(headers, cells, "description") || null,
      productUrl: valueFor(headers, cells, "producturl"),
      affiliateUrl: valueFor(headers, cells, "affiliateurl") || null,
      imageUrl: valueFor(headers, cells, "imageurl") || null,
      category: valueFor(headers, cells, "category"),
      sellerName: valueFor(headers, cells, "sellername") || null,
      currentPrice: numberOrNull(valueFor(headers, cells, "currentprice")),
      originalPrice: numberOrNull(valueFor(headers, cells, "originalprice")),
      rating: numberOrNull(valueFor(headers, cells, "rating")),
      reviewCount: numberOrNull(valueFor(headers, cells, "reviewcount")) ?? 0,
      commissionRate: numberOrNull(valueFor(headers, cells, "commissionrate")),
      sellerRating: numberOrNull(valueFor(headers, cells, "sellerrating")),
      stockStatus:
        valueFor(headers, cells, "stockstatus")?.toUpperCase() || "UNKNOWN",
      returnRisk:
        valueFor(headers, cells, "returnrisk")?.toUpperCase() || "UNKNOWN",
      status: valueFor(headers, cells, "status")?.toUpperCase() || "NEW",
      notes: valueFor(headers, cells, "notes") || null,
      tags,
    };

    const result = productInputSchema.safeParse(candidate);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        row: rowIndex + 2,
        message: z.prettifyError(result.error),
      });
    }
  }

  if (rows.length > 101) {
    errors.push({
      row: 102,
      message: "Only the first 100 product rows can be imported at once.",
    });
  }

  return { valid, errors };
}
