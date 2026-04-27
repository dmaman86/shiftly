import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/redux/store", () => ({
  store: {
    getState: () => ({}),
    subscribe: vi.fn(),
    dispatch: vi.fn(),
  },
}));

vi.mock("@/app/providers/domain/DomainProvider", () => ({
  DomainProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/providers/snackbar/AppSnackbarProvider", () => ({
  AppSnackbarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AppProviders } from "@/app/providers/AppProviders";

describe("AppProviders", () => {
  beforeEach(() => {
    document.documentElement.dir = "";
    document.documentElement.lang = "";
  });

  it("renders children", () => {
    render(
      <AppProviders>
        <div>Test Child</div>
      </AppProviders>
    );
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("sets document dir to rtl for Hebrew path", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/he/daily" },
      writable: true,
    });

    render(
      <AppProviders>
        <div>Child</div>
      </AppProviders>
    );

    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("he");
    });
  });

  it("sets document dir to ltr for English path", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/en/daily" },
      writable: true,
    });

    render(
      <AppProviders>
        <div>Child</div>
      </AppProviders>
    );

    await waitFor(() => {
      expect(document.documentElement.dir).toBe("ltr");
      expect(document.documentElement.lang).toBe("en");
    });
  });
});
