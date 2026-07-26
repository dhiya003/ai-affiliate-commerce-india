import { z } from "zod";

const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.url(),
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(32),
    ADMIN_EMAILS: z.string().default(""),
    AI_PROVIDER: z.enum(["openai"]).default("openai"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production" && !environment.OPENAI_API_KEY) {
      context.addIssue({
        code: "custom",
        message: "OPENAI_API_KEY is required in production",
        path: ["OPENAI_API_KEY"],
      });
    }
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
