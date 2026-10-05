import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import { CalculationStatus } from "@/features/work-table/components/month/CalculationStatus";

afterEach(() => vi.useRealTimers());

describe("CalculationStatus", () => {
  it("announces only the settled calculation, not initial rendering or intermediate updates", () => {
    vi.useFakeTimers();
    const { rerender } = renderWithTheme(
      <CalculationStatus message="Total 0" />,
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    rerender(<CalculationStatus message="Total 50" />);
    act(() => vi.advanceTimersByTime(500));
    rerender(<CalculationStatus message="Total 100" />);
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveTextContent("Total 100");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("cancels a pending announcement when the calculation returns to its previous value", () => {
    vi.useFakeTimers();
    const { rerender } = renderWithTheme(
      <CalculationStatus message="Total 0" />,
    );
    rerender(<CalculationStatus message="Total 50" />);
    rerender(<CalculationStatus message="Total 0" />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
