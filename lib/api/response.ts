import { NextResponse } from "next/server";

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

function createMeta(requestId: string): ApiMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function apiSuccess<T>(
  data: T,
  options: { requestId?: string; status?: number } = {},
): NextResponse<ApiSuccess<T>> {
  const requestId = options.requestId ?? crypto.randomUUID();

  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta(requestId),
    },
    {
      status: options.status ?? 200,
      headers: { "x-request-id": requestId },
    },
  );
}

export function apiFailure(
  error: ApiFailure["error"],
  options: { requestId?: string; status?: number } = {},
): NextResponse<ApiFailure> {
  const requestId = options.requestId ?? crypto.randomUUID();

  return NextResponse.json(
    {
      success: false,
      error,
      meta: createMeta(requestId),
    },
    {
      status: options.status ?? 500,
      headers: { "x-request-id": requestId },
    },
  );
}
