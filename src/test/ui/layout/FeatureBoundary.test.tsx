import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { FeatureBoundary } from "@/layout/error-boundary/FeatureBoundary";

const { analyticsTrackMock } = vi.hoisted(() => ({
  analyticsTrackMock: vi.fn(),
}));

vi.mock("@/services", () => ({
  analyticsService: { track: analyticsTrackMock },
}));

const ThrowingFeature = () => {
  throw new Error("Sensitive feature details");
};

describe("FeatureBoundary", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the feature fallback and reports one non-fatal exception", () => {
    render(
      <FeatureBoundary featureName="Work table" errorContext="WorkTable">
        <ThrowingFeature />
      </FeatureBoundary>,
    );

    expect(screen.getByText("Could not load Work table.")).toBeInTheDocument();
    expect(analyticsTrackMock).toHaveBeenCalledOnce();
    expect(analyticsTrackMock).toHaveBeenCalledWith({
      name: "exception",
      params: {
        description: "Sensitive feature details",
        error_context: "WorkTable",
        error_type: "Error",
        fatal: false,
      },
    });
  });
});
