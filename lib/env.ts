import { z } from "zod";

const optionalString = (minimumLength = 1) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minimumLength).optional(),
  );

const optionalHttpsUrl = (message: string) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .url()
      .refine(
        (value) => {
          try {
            return new URL(value).protocol === "https:";
          } catch {
            return false;
          }
        },
        { message },
      )
      .optional(),
  );

const serverEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: optionalString(),
  AUTH_SECRET: z.string().min(32),
  ADMIN_EMAILS: z.string().default(""),
  AI_PROVIDER: z.enum(["openai"]).default("openai"),
  OPENAI_API_KEY: optionalString(),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5.6-sol"),
  ERROR_MONITORING_WEBHOOK_URL: optionalHttpsUrl(
    "Monitoring endpoint must use HTTPS.",
  ),
  ERROR_MONITORING_TOKEN: optionalString(16),
  NOTIFICATION_EMAIL_WEBHOOK_URL: optionalHttpsUrl(
    "Notification webhook endpoint must use HTTPS.",
  ),
  NOTIFICATION_EMAIL_TOKEN: optionalString(16),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const workerEnvironmentSchema = z
  .object({
    ENVIRONMENT_VALIDATION_MODE: z.enum(["strict", "test"]).default("strict"),
    DB: z.unknown().optional(),
    ASSETS: z.unknown().optional(),
    IMAGES: z.unknown().optional(),
    OPENAI_API_KEY: optionalString(),
    OPENAI_MODEL: z.string().trim().min(1).default("gpt-5.6-sol"),
    ERROR_MONITORING_WEBHOOK_URL: optionalHttpsUrl(
      "Monitoring endpoint must use HTTPS.",
    ),
    ERROR_MONITORING_TOKEN: optionalString(16),
    NOTIFICATION_EMAIL_WEBHOOK_URL: optionalHttpsUrl(
      "Notification webhook endpoint must use HTTPS.",
    ),
    NOTIFICATION_EMAIL_TOKEN: optionalString(16),
  })
  .superRefine((environment, context) => {
    if (environment.ENVIRONMENT_VALIDATION_MODE !== "strict") return;
    for (const binding of ["DB", "ASSETS", "IMAGES"] as const) {
      if (
        environment[binding] == null ||
        typeof environment[binding] !== "object"
      ) {
        context.addIssue({
          code: "custom",
          path: [binding],
          message: `${binding} Worker binding is required in strict mode.`,
        });
      }
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

function validationError(
  label: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  const details = issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  return new Error(`Invalid ${label} environment: ${details}`);
}

export function validateEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    throw validationError("server", result.error.issues);
  }

  return result.data;
}

export function validateWorkerEnvironment(
  source: Record<string, unknown>,
): WorkerEnvironment {
  const result = workerEnvironmentSchema.safeParse(source);
  if (!result.success) {
    throw validationError("Worker", result.error.issues);
  }
  return result.data;
}

let cachedEnvironment: ServerEnvironment | undefined;

export function getEnvironment(): ServerEnvironment {
  cachedEnvironment ??= validateEnvironment();
  return cachedEnvironment;
}
