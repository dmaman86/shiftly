import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { FeatureErrorFallback } from "@/layout/error-boundary/FeatureErrorFallback";

describe("FeatureErrorFallback", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders a generic feature error and retries", () => {
    const resetError = vi.fn();

    render(
      <FeatureErrorFallback
        featureName="Work table"
        resetError={resetError}
      />,
    );

    expect(screen.getByText("Could not load Work table.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(resetError).toHaveBeenCalledOnce();
  });
});
