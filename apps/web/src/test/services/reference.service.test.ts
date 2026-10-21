import { AxiosError, AxiosHeaders } from "axios";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { referenceService } from "@/services/reference/reference.service";

const API = "https://api.example";
const ELECTION = { knessetNumber: 26, date: "2026-10-27", status: "planned" };

const httpError = (status: number) =>
  new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

describe("referenceService.getElections", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("VITE_API_URL", API);
  });

  it("asks the public endpoint with a finite timeout", async () => {
    const get = vi
      .spyOn(axios, "get")
      .mockResolvedValue({ data: { year: 2026, elections: [ELECTION] } });

    expect(await referenceService().getElections(2026)).toEqual({
      source: "api",
      elections: [ELECTION],
    });
    expect(get).toHaveBeenCalledWith(`${API}/reference/elections`, {
      params: { year: 2026 },
      timeout: 5000,
    });
  });

  it("ignores a trailing slash in the base URL", async () => {
    vi.stubEnv("VITE_API_URL", `${API}/`);
    const get = vi
      .spyOn(axios, "get")
      .mockResolvedValue({ data: { year: 2026, elections: [] } });
    await referenceService().getElections(2026);
    expect(get.mock.calls[0][0]).toBe(`${API}/reference/elections`);
  });

  it("treats an empty list as an authoritative answer", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: { year: 2024, elections: [] },
    });
    expect(await referenceService().getElections(2024)).toEqual({
      source: "api",
      elections: [],
    });
  });

  it("is unavailable without calling anything when no API is configured", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const get = vi.spyOn(axios, "get");
    expect(await referenceService().getElections(2026)).toEqual({
      source: "unavailable",
      reason: "not_configured",
    });
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    ["a timeout", new AxiosError("timeout", "ECONNABORTED"), "timeout"],
    [
      "a network failure",
      new AxiosError("Network Error", "ERR_NETWORK"),
      "network",
    ],
    ["a 503", httpError(503), "http_503"],
    ["a 500", httpError(500), "http_500"],
  ])("is unavailable on %s", async (_label, error, reason) => {
    vi.spyOn(axios, "get").mockRejectedValue(error);
    expect(await referenceService().getElections(2026)).toEqual({
      source: "unavailable",
      reason,
    });
  });

  it.each([400, 404])("surfaces a %s instead of hiding it", async (status) => {
    vi.spyOn(axios, "get").mockRejectedValue(httpError(status));
    await expect(referenceService().getElections(2026)).rejects.toThrow(
      "Request failed",
    );
  });

  it.each([
    ["another year", { year: 2025, elections: [] }],
    ["no list", { year: 2026 }],
    [
      "a cancelled election",
      { year: 2026, elections: [{ ...ELECTION, status: "cancelled" }] },
    ],
    [
      "a malformed date",
      { year: 2026, elections: [{ ...ELECTION, date: "27/10/2026" }] },
    ],
    ["an HTML page", "<!doctype html>"],
  ])("rejects a 200 with %s as a contract violation", async (_label, data) => {
    vi.spyOn(axios, "get").mockResolvedValue({ data });
    await expect(referenceService().getElections(2026)).rejects.toThrow(
      "Invalid elections response for 2026",
    );
  });
});
