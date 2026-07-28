import { z } from "zod";

const optionalString = (minimumLength = 1) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minimumLength).optional(),
  );

const optionalHttpsUrl = z.preprocess(
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
      {
        message: "Monitoring endpoint must use HTTPS.",
      },
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
  ERROR_MONITORING_WEBHOOK_URL: optionalHttpsUrl,
  ERROR_MONITORING_TOKEN: optionalString(16),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function validateEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  return result.data;
}

let cachedEnvironment: ServerEnvironment | undefined;

export function getEnvironment(): ServerEnvironment {
  cachedEnvironment ??= validateEnvironment();
  return cachedEnvironment;
}
