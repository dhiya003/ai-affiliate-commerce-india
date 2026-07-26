import { ZodError } from "zod";
import { apiFailure } from "./response";

type PrismaKnownError = Error & {
  code: string;
  meta?: { target?: unknown };
};

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(
  error: unknown,
  requestId = crypto.randomUUID(),
) {
  if (error instanceof ApiError) {
    return apiFailure(
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      { requestId, status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return apiFailure(
      {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid data.",
        details: error.flatten(),
      },
      { requestId, status: 422 },
    );
  }

  if (isPrismaKnownError(error)) {
    if (error.code === "P2002") {
      return apiFailure(
        {
          code: "DUPLICATE_RESOURCE",
          message: "A resource with the same unique values already exists.",
          details: { target: error.meta?.target },
        },
        { requestId, status: 409 },
      );
    }

    if (error.code === "P2025") {
      return apiFailure(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "The requested resource was not found.",
        },
        { requestId, status: 404 },
      );
    }

    console.error("Database request failed.", {
      requestId,
      code: error.code,
    });

    return apiFailure(
      {
        code: "DATABASE_ERROR",
        message: "The database request could not be completed.",
      },
      { requestId, status: 503 },
    );
  }

  console.error("Unhandled API error.", { requestId, error });

  return apiFailure(
    {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    },
    { requestId, status: 500 },
  );
}
