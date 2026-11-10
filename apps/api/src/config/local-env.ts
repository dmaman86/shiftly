import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

/** Most specific first: apps/api/.env, then the repository's .env.local. */
export const LOCAL_ENV_FILES = ["../../.env", "../../../../.env.local"].map(
  (path) => fileURLToPath(new URL(path, import.meta.url)),
);

/**
 * Loads the local env files into process.env, for development and the admin
 * commands. The first file that defines a variable wins, and variables already
 * set (the shell, Cloud Run) are never overridden. Paths resolve from this
 * file, so neither the cwd nor the caller's location matters.
 */
export const loadLocalEnvFiles = (): void => {
  loadDotenv({ path: LOCAL_ENV_FILES, quiet: true });
};
