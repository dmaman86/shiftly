import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { SupabaseRevisionRepository } from "./reference-data/supabase-revision-repository.ts";

const AdminEnv = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

/**
 * The reference-data store for local administrator commands, with the backend
 * secret key. Exits when the environment is incomplete.
 */
export function adminRepository(): SupabaseRevisionRepository {
  // Same lookup as server.ts: the first file that defines a variable wins.
  loadDotenv({
    path: [
      fileURLToPath(new URL("../.env", import.meta.url)),
      fileURLToPath(new URL("../../../.env.local", import.meta.url)),
    ],
    quiet: true,
  });

  const parsed = AdminEnv.safeParse(process.env);
  if (!parsed.success) {
    // Names only: never print the values.
    const missing = parsed.error.issues.map((issue) => issue.path.join("."));
    console.error(
      `Invalid or missing environment variables: ${missing.join(", ")}`,
    );
    process.exit(1);
  }
  return new SupabaseRevisionRepository({
    url: parsed.data.SUPABASE_URL,
    secretKey: parsed.data.SUPABASE_SECRET_KEY,
  });
}
