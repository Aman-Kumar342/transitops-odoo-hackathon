import { z } from "zod";

/**
 * Runtime environment validation.
 *
 * Fail fast: if required configuration is missing or malformed, the app should refuse
 * to start rather than fail unpredictably at request time. (guidelines.md §13, §14)
 *
 * `JWT_SECRET` is required from Phase 1 onward; kept optional-with-warning in Phase 0
 * so the foundation runs before auth exists.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    })
    .optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default("1d"),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Surface a readable error at boot instead of a cryptic runtime failure.
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment configuration. See .env.example.");
}

export const env = parsed.data;

/** True once a database connection string is configured. */
export const isDatabaseConfigured = Boolean(env.DATABASE_URL);
