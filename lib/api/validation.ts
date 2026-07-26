import type { ZodType } from "zod";
import { ApiError } from "./errors";

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "The request body must contain valid JSON.",
    );
  }

  return schema.parse(body);
}

export function parseSearchParams<T>(request: Request, schema: ZodType<T>): T {
  const values = Object.fromEntries(new URL(request.url).searchParams);
  return schema.parse(values);
}
