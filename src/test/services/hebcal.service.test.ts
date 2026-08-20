import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { hebcalService } from "@/services/hebcal/hebcal.service";

describe("hebcalService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the explicit Israel calendar contract", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: { items: [] } });

    const request = hebcalService().getData("2025-01-01", "2025-02-01");
    await request.call();

    const [rawUrl, config] = get.mock.calls[0];
    const url = new URL(rawUrl);

    expect(url.origin).toBe("https://www.hebcal.com");
    expect(url.searchParams.get("v")).toBe("1");
    expect(url.searchParams.get("cfg")).toBe("json");
    expect(url.searchParams.get("start")).toBe("2025-01-01");
    expect(url.searchParams.get("end")).toBe("2025-02-01");
    expect(url.searchParams.get("i")).toBe("on");
    expect(url.searchParams.get("lg")).toBe("s");
    expect(url.searchParams.get("maj")).toBe("on");
    expect(url.searchParams.get("mod")).toBe("on");
    expect(url.searchParams.get("nx")).toBe("on");
    expect(url.searchParams.has("s")).toBe(false);
    expect(config?.signal).toBe(request.controller.signal);
  });
});
