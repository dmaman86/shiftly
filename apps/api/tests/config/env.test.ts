import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadAdminEnv,
  loadArtifactsDir,
  loadEnv,
  loadResearchEnv,
} from "../../src/config/env.ts";
import { LOCAL_ENV_FILES } from "../../src/config/local-env.ts";

const API_ROOT = join(import.meta.dirname, "../..");

const BASE = {
  GEMINI_API_KEY: "test-key",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};

describe("loadEnv", () => {
  it("keeps reference-data persistence off by default", () => {
    expect(loadResearchEnv(BASE).REFERENCE_DATA_PERSISTENCE_ENABLED).toBe(
      false,
    );
  });

  it("fails fast at startup without the Supabase settings authentication needs", () => {
    expect(() => loadEnv({ GEMINI_API_KEY: "test-key" })).toThrow(
      "Invalid or missing environment variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY",
    );
  });

  it("uses no dedicated user-data key unless one is set", () => {
    expect(loadEnv(BASE).SUPABASE_USER_DATA_SECRET_KEY).toBeUndefined();
    expect(
      loadEnv({ ...BASE, SUPABASE_USER_DATA_SECRET_KEY: "sb_secret_user" })
        .SUPABASE_USER_DATA_SECRET_KEY,
    ).toBe("sb_secret_user");
  });

  it("rejects an empty dedicated user-data key", () => {
    expect(() =>
      loadEnv({ ...BASE, SUPABASE_USER_DATA_SECRET_KEY: "" }),
    ).toThrow("SUPABASE_USER_DATA_SECRET_KEY");
  });

  it("accepts persistence with the Supabase settings", () => {
    const env = loadResearchEnv({
      ...BASE,
      REFERENCE_DATA_PERSISTENCE_ENABLED: "true",
    });
    expect(env.REFERENCE_DATA_PERSISTENCE_ENABLED).toBe(true);
  });

  it("never prints secret values in the error", () => {
    expect(() =>
      loadEnv({
        ...BASE,
        GEMINI_API_KEY: "",
        SUPABASE_URL: "not a url",
        SUPABASE_SECRET_KEY: "sb_secret_do_not_print",
      }),
    ).toThrow(/^(?!.*sb_secret_do_not_print).*$/);
  });

  it("binds to loopback unless HOST says otherwise", () => {
    expect(loadEnv(BASE).HOST).toBe("127.0.0.1");
    expect(loadEnv({ ...BASE, HOST: "0.0.0.0" }).HOST).toBe("0.0.0.0");
  });

  it("parses the CORS allowlist as exact origins", () => {
    const env = loadEnv({
      ...BASE,
      CORS_ALLOWED_ORIGINS: " https://user.github.io , http://localhost:5173",
    });
    expect(env.CORS_ALLOWED_ORIGINS).toEqual([
      "https://user.github.io",
      "http://localhost:5173",
    ]);
    expect(loadEnv(BASE).CORS_ALLOWED_ORIGINS).toEqual([]);
  });

  it("rejects entries that are not bare origins", () => {
    for (const value of [
      "https://user.github.io/shiftly",
      "https://user.github.io/",
      "*",
    ]) {
      expect(() => loadEnv({ ...BASE, CORS_ALLOWED_ORIGINS: value })).toThrow(
        "CORS_ALLOWED_ORIGINS",
      );
    }
  });

  it("requires a CORS allowlist in production", () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: "production" })).toThrow(
      "Invalid or missing environment variables: CORS_ALLOWED_ORIGINS",
    );
    const env = loadEnv({
      ...BASE,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://user.github.io",
    });
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(["https://user.github.io"]);
  });
});

describe("loadAdminEnv", () => {
  it("needs only the Supabase URL and secret key, not the server's settings", () => {
    expect(
      loadAdminEnv({
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test",
      }),
    ).toEqual({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test",
    });
  });

  it("names what is missing and never prints values", () => {
    expect(() =>
      loadAdminEnv({ SUPABASE_URL: "sb_secret_do_not_print" }),
    ).toThrow(
      "Invalid or missing environment variables: SUPABASE_URL, SUPABASE_SECRET_KEY",
    );
  });
});

describe("loadArtifactsDir", () => {
  it("defaults to apps/api/.artifacts, like the server", () => {
    expect(loadArtifactsDir({})).toBe(join(API_ROOT, ".artifacts"));
    expect(loadArtifactsDir({})).toBe(loadEnv(BASE).ARTIFACTS_DIR);
  });

  it("uses ARTIFACTS_DIR when set", () => {
    expect(loadArtifactsDir({ ARTIFACTS_DIR: "/tmp/artifacts" })).toBe(
      "/tmp/artifacts",
    );
  });
});

describe("LOCAL_ENV_FILES", () => {
  it("reads apps/api/.env first, then the repository's .env.local", () => {
    expect(LOCAL_ENV_FILES).toEqual([
      join(API_ROOT, ".env"),
      join(API_ROOT, "../..", ".env.local"),
    ]);
  });
});
