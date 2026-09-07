import { MemoryRouter, useLocation } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { ErrorFallback } from "@/layout/error-boundary/ErrorFallback";

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

describe("ErrorFallback", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("uses the route language for direction and home navigation", () => {
    render(
      <MemoryRouter initialEntries={["/en/monthly"]}>
        <ErrorFallback resetError={vi.fn()} />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Oops! Something went wrong").closest("[dir]"),
    ).toHaveAttribute("dir", "ltr");

    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/en/daily");
  });

  it("calls the reset callback", () => {
    const resetError = vi.fn();

    render(
      <MemoryRouter initialEntries={["/he/daily"]}>
        <ErrorFallback resetError={resetError} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(resetError).toHaveBeenCalledOnce();
  });
});
