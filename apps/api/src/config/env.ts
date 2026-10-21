import { fileURLToPath } from "node:url";
import { z } from "zod";

const apiRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url));

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
    /** Google AI Studio (Gemini API) key. Backend only: never prefix it with VITE_. */
    GEMINI_API_KEY: z.string().min(1),
    GEMINI_MODEL: z.string().min(1).default("gemma-4-31b-it"),
    /** Each rules pipeline writes to its own subfolder. */
    ARTIFACTS_DIR: z.string().default(apiRoot(".artifacts")),
    /** Off by default: research results are only returned, not stored. */
    REFERENCE_DATA_PERSISTENCE_ENABLED: z.stringbool().default(false),
    /**
     * Required: every request except /health is authenticated with Supabase
     * Auth. Same project URL as the frontend's VITE_SUPABASE_URL.
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
  })
  .refine(
    (env) =>
      env.NODE_ENV !== "production" || env.CORS_ALLOWED_ORIGINS.length > 0,
    { path: ["CORS_ALLOWED_ORIGINS"], message: "required in production" },
  );

export type Env = z.infer<typeof envSchema>;

/** Fails fast at boot; error output lists variable names, never their values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Invalid or missing environment variables: ${names.join(", ")}`,
    );
  }
  return parsed.data;
}
