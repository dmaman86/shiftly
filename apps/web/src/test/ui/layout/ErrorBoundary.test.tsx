import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { ErrorBoundary } from "@/layout/error-boundary/ErrorBoundary";

const { analyticsTrackMock } = vi.hoisted(() => ({
  analyticsTrackMock: vi.fn(),
}));

vi.mock("@/services", () => ({
  analyticsService: { track: analyticsTrackMock },
}));

const ThrowingChild = ({ message }: { message: string }) => {
  throw new Error(message);
};

const ConditionalChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("Feature crashed");

  return <div>Feature recovered</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a retry fallback when none is provided", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Sensitive implementation detail" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Unexpected error")).toBeInTheDocument();
    expect(
      screen.queryByText("Sensitive implementation detail"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeEnabled();
  });

  it("reports feature errors as non-fatal by default", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Feature crashed" />
      </ErrorBoundary>,
    );

    expect(analyticsTrackMock).toHaveBeenCalledWith({
      name: "exception",
      params: {
        description: "Feature crashed",
        error_type: "Error",
        fatal: false,
      },
    });
  });

  it("reports a boundary configured as fatal", () => {
    render(
      <ErrorBoundary fatal>
        <ThrowingChild message="Application crashed" />
      </ErrorBoundary>,
    );

    expect(analyticsTrackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ fatal: true }),
      }),
    );
  });

  it("resets automatically when a reset key changes", async () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={[2026, 1]}>
        <ConditionalChild shouldThrow />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary resetKeys={[2026, 2]}>
        <ConditionalChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByText("Feature recovered")).toBeInTheDocument();
    });
  });

  it("does not reset for a new array containing equal reset keys", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={[2026, 1]}>
        <ConditionalChild shouldThrow />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary resetKeys={[2026, 1]}>
        <ConditionalChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Unexpected error")).toBeInTheDocument();
    expect(screen.queryByText("Feature recovered")).not.toBeInTheDocument();
  });
});
