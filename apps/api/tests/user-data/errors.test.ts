import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleUserDataErrors,
  UserDataError,
  userDataErrorFrom,
  type UserDataErrorCode,
} from "../../src/user-data/errors.ts";

describe("userDataErrorFrom", () => {
  it.each<[number, string, UserDataErrorCode]>([
    [401, "PGRST303", "unauthenticated"],
    [401, "PGRST301", "unauthenticated"],
    [401, "", "unauthenticated"],
    [403, "42501", "not_found"],
    [400, "22023", "invalid_request"],
    [400, "22P02", "invalid_request"],
    [400, "22007", "invalid_request"],
    [400, "23502", "invalid_request"],
    [400, "23514", "invalid_request"],
    [409, "23505", "conflict"],
    [0, "", "data_unavailable"],
    [503, "PGRST001", "data_unavailable"],
    [504, "", "data_unavailable"],
    [500, "XX000", "internal_error"],
    [400, "PGRST204", "internal_error"],
  ])("status %i, code %j → %s", (status, code, expected) => {
    const mapped = userDataErrorFrom({
      status,
      error: { code, message: "database says something" },
    });
    expect(mapped).toBeInstanceOf(UserDataError);
    expect(mapped.code).toBe(expected);
    expect(mapped.sourceCode).toBe(code || undefined);
  });
});

describe("handleUserDataErrors", () => {
  let server: Server | undefined;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    warn.mockRestore();
    await new Promise((resolve) => server?.close(resolve));
    server = undefined;
  });

  async function start(thrown: unknown) {
    const app = express();
    app.get("/me/thing", async () => {
      throw thrown;
    });
    // Express recognises error handlers by their four-parameter arity.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use(handleUserDataErrors, ((_error, _req, res, _next) => {
      res.status(599).json({ error: { code: "passed_on" } });
    }) as express.ErrorRequestHandler);
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    return fetch(`http://127.0.0.1:${port}/me/thing`);
  }

  it.each<[UserDataErrorCode, number]>([
    ["unauthenticated", 401],
    ["not_found", 404],
    ["invalid_request", 400],
    ["conflict", 409],
    ["data_unavailable", 503],
    ["internal_error", 500],
  ])("answers %s with %i and the code only", async (code, status) => {
    const response = await start(
      new UserDataError(code, 'secret detail from "shifts"', "XX"),
    );
    expect(response.status).toBe(status);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe(code);
    expect(body.error.message).not.toContain("secret detail");
  });

  it("asks for a Bearer token on 401", async () => {
    const response = await start(
      new UserDataError("unauthenticated", "JWT expired", "PGRST303"),
    );
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  it("logs the database code for operators", async () => {
    await start(new UserDataError("not_found", "rls", "42501"));
    const logged = JSON.parse(String(warn.mock.calls[0][0])) as Record<
      string,
      unknown
    >;
    expect(logged).toMatchObject({
      event: "user_data_error",
      code: "not_found",
      sourceCode: "42501",
    });
  });

  it("passes any other error on", async () => {
    const response = await start(new Error("boom"));
    expect(response.status).toBe(599);
  });
});
