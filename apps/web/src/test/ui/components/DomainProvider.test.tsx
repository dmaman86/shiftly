import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { DomainProvider } from "@/app/providers/domain/DomainProvider";
import { domain as baselineDomain } from "@/app";
import { useDomain, useReferenceStatus } from "@/hooks";

const PUBLISHED = {
  "per_diem.point_rate": [
    { validFrom: "2015-11-01", validTo: null, value: { amount: 40 } },
  ],
  "meal_allowance.rates": [
    { validFrom: "2015-11-01", validTo: null, value: { small: 1, large: 2 } },
  ],
};

const Probe = () => {
  const domain = useDomain();
  const status = useReferenceStatus();
  return (
    <output>
      {domain.resolvers.perDiemResolver.calculateRate({
        year: 2026,
        month: 10,
      })}
      |{status?.settled ? status.source.status : "loading"}
    </output>
  );
};

const renderProvider = (override?: typeof baselineDomain) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <DomainProvider override={override}>
        <Probe />
      </DomainProvider>
    </QueryClientProvider>,
  );

describe("DomainProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubEnv("VITE_API_URL", "https://api.example");
  });

  it("calculates with the baseline at once, then with the published rates", async () => {
    let answer!: (value: unknown) => void;
    vi.spyOn(axios, "get").mockReturnValue(
      new Promise((resolve) => (answer = resolve)),
    );

    renderProvider();
    expect(screen.getByRole("status")).toHaveTextContent("36.3|loading");

    answer({ data: { timelines: PUBLISHED } });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("40|fresh"),
    );
  });

  it("keeps calculating with the baseline when the API is down", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(
      Object.assign(new Error("Network Error"), {
        isAxiosError: true,
        code: "ERR_NETWORK",
      }),
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("36.3|baseline"),
    );
  });

  it("uses an override as is, without loading rates", () => {
    const get = vi.spyOn(axios, "get");

    renderProvider(baselineDomain);

    expect(screen.getByRole("status")).toHaveTextContent("36.3|loading");
    expect(get).not.toHaveBeenCalled();
  });
});
