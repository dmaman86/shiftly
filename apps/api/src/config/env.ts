import { z } from "zod";

/** Exact browser origins (scheme, host and port only), comma separated. */
const originList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ""),
  )
  .pipe(
    z.array(
      z
        .url()
        .refine(
          (origin) => URL.canParse(origin) && new URL(origin).origin === origin,
          {
            message: "must be an origin, without path or trailing slash",
          },
        ),
    ),
  );

const envSchema = z
  .object({
    NODE_ENV: z.string().default("development"),
    /** Loopback by default; containers set 0.0.0.0 so the platform can reach it. */
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().positive().default(3000),
    /**
     * Origins whose pages may call this API from a browser. Required in
     * production; never a wildcard.
     */
    CORS_ALLOWED_ORIGINS: originList,
    /**
     * Required: verifies Supabase Auth tokens and reads and writes data.
     * Same project URL as the frontend's VITE_SUPABASE_URL.
     */
    SUPABASE_URL: z.url(),
    /**
     * Publishable key (sb_publishable_...), the same value as the frontend's
     * VITE_SUPABASE_PUBLISHABLE_KEY. Used only to verify access tokens.
     */
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    /**
     * Secret key (sb_secret_...), which bypasses RLS: reads roles and writes
     * reference data. Backend only: never prefix it with VITE_.
     */
    SUPABASE_SECRET_KEY: z.string().min(1),
    /**
     * Optional secret key used only for user-owned data, so it can be rotated
     * or revoked without touching reference data and admin work. Another key
     * of the same project: the same service_role privileges, a separate
     * credential. Unset: SUPABASE_SECRET_KEY is used.
     */
    SUPABASE_USER_DATA_SECRET_KEY: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      env.NODE_ENV !== "production" || env.CORS_ALLOWED_ORIGINS.length > 0,
    { path: ["CORS_ALLOWED_ORIGINS"], message: "required in production" },
  );

/** What the admin commands need: the reference-data store, with the secret key. */
const adminEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
export type AdminEnv = z.infer<typeof adminEnvSchema>;

const researchEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1),
  GEMINI_MODEL: z.string().trim().min(1).default("gemma-4-31b-it"),
  REFERENCE_RESEARCH_ENABLED: z.stringbool().default(false),
});
export type ResearchEnv = z.infer<typeof researchEnvSchema>;

/** The error lists variable names, never their values. */
const parseEnv = <T>(schema: z.ZodType<T>, source: NodeJS.ProcessEnv): T => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Invalid or missing environment variables: ${names.join(", ")}`,
    );
  }
  return parsed.data;
};

/** The server's settings. Fails fast at boot. */
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  return parseEnv(envSchema, source);
};

/** The admin commands' settings: only what they use, nothing the server needs. */
export const loadAdminEnv = (
  source: NodeJS.ProcessEnv = process.env,
): AdminEnv => parseEnv(adminEnvSchema, source);

/** Called only by explicit research operations, never by core API startup. */
export const loadResearchEnv = (
  source: NodeJS.ProcessEnv = process.env,
): ResearchEnv => parseEnv(researchEnvSchema, source);
