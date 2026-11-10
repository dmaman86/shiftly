import { loadAdminEnv } from "../config/env.ts";
import { loadLocalEnvFiles } from "../config/local-env.ts";
import { SupabaseRevisionRepository } from "../repositories/supabase-revision-repository.ts";

/**
 * The reference-data store for local administrator commands, with the backend
 * secret key. Exits when the environment is incomplete.
 */
export function adminRepository(): SupabaseRevisionRepository {
  loadLocalEnvFiles();
  try {
    const env = loadAdminEnv();
    return new SupabaseRevisionRepository({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    });
  } catch (error) {
    // The message lists variable names only, never their values.
    console.error((error as Error).message);
    process.exit(1);
  }
}
