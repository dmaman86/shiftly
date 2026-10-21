import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/env.ts";

const BASE = {
  GEMINI_API_KEY: "test-key",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};

describe("loadEnv", () => {
  it("keeps reference-data persistence off by default", () => {
    expect(loadEnv(BASE).REFERENCE_DATA_PERSISTENCE_ENABLED).toBe(false);
  });

  it("fails fast at startup without the Supabase settings authentication needs", () => {
    expect(() => loadEnv({ GEMINI_API_KEY: "test-key" })).toThrow(
      "Invalid or missing environment variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY",
    );
  });

  it("accepts persistence with the Supabase settings", () => {
    const env = loadEnv({
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
