import { describe, expect, it, vi } from "vitest";
import { AuthUnavailableError } from "../../src/auth/ports.ts";
import { SupabaseRoleRepository } from "../../src/auth/supabase-role-repository.ts";
import { ADMIN_ID } from "./fakes.ts";

const SECRET = "sb_secret_test";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function repositoryWith(response: Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response.clone());
  const repository = new SupabaseRoleRepository({
    url: "https://project.supabase.co",
    secretKey: SECRET,
    fetch,
  });
  const request = () => {
    const [input, init] = fetch.mock.calls[0];
    return { url: new URL(String(input)), headers: new Headers(init?.headers) };
  };
  return { repository, request };
}

describe("SupabaseRoleRepository", () => {
  it("reads the user's roles from app_user_roles with the secret key", async () => {
    const { repository, request } = repositoryWith(json([{ role: "admin" }]));

    expect(await repository.rolesOf(ADMIN_ID)).toEqual(["admin"]);

    const { url, headers } = request();
    expect(url.pathname).toBe("/rest/v1/app_user_roles");
    expect(url.searchParams.get("user_id")).toBe(`eq.${ADMIN_ID}`);
    expect(headers.get("apikey")).toBe(SECRET);
  });

  it("returns no elevated roles for a normal user", async () => {
    const { repository } = repositoryWith(json([]));
    expect(await repository.rolesOf(ADMIN_ID)).toEqual([]);
  });

  it("grants nothing for a role this code does not know", async () => {
    const { repository } = repositoryWith(
      json([{ role: "superuser" }, { role: "admin" }]),
    );
    expect(await repository.rolesOf(ADMIN_ID)).toEqual(["admin"]);
  });

  it("throws instead of answering when roles cannot be read", async () => {
    const { repository } = repositoryWith(
      json(
        {
          code: "42501",
          message: "permission denied for table app_user_roles",
        },
        403,
      ),
    );
    await expect(repository.rolesOf(ADMIN_ID)).rejects.toThrow(
      AuthUnavailableError,
    );
  });
});
