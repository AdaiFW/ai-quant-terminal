import { z } from "zod";

/* ── Environment variable validation ── */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o"),
  AI_MAX_TOKENS: z.coerce.number().default(4096),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),

  // Stock APIs
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  POLYGON_API_KEY: z.string().optional(),

  // App
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Feature flags
  ENABLE_REALTIME_UPDATES: z.coerce.boolean().default(false),
  ENABLE_BACKTESTING: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new Error(`Invalid environment variables:\n${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}

/** Validated environment variables. Call at app boot. */
export const env = parseEnv();
