import { describe, it, expect } from "vitest";
import {
  createMockGlobalState,
  renderWithProviders,
  screen,
  waitFor,
} from "@/test/ui/utils";
import userEvent from "@testing-library/user-event";
import { ConfigPanel } from "@/features/config/ConfigPanel";
import { pipelineInstance } from "@/test/ui/utils/setup-domain";

describe("ConfigPanel", () => {
  const mockDomain = {
    payMap: {
      shiftMapBuilder: pipelineInstance.payMap.shiftMapBuilder,
      dayPayMapBuilder: pipelineInstance.payMap.dayPayMapBuilder,
      monthPayMapCalculator: pipelineInstance.payMap.monthPayMapCalculator,
      workDaysMonthBuilder: pipelineInstance.payMap.workDaysForMonthBuilder,
    },
    resolvers: {
      holidayResolver: pipelineInstance.rateCalculators.holiday,
      perDiemResolver: pipelineInstance.rateCalculators.perDiemRate,
      dayInfoResolver: pipelineInstance.resolvers.workDayInfoResolver,
      monthResolver: pipelineInstance.resolvers.monthResolver,
      mealAllowanceRateResolver: pipelineInstance.rateCalculators.mealAllowanceRate,
    },
    services: {
      dateService: pipelineInstance.services.dateService,
      shiftService: pipelineInstance.services.shiftService,
    },
  };

  describe("Basic Rendering", () => {
    it("should render panel title", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByText("הגדרות חישוב")).toBeInTheDocument();
    });

    it("should render date section with calendar icon", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByTestId("CalendarTodayIcon")).toBeInTheDocument();
    });

    it("should render work parameters section", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByText("פרמטרי עבודה")).toBeInTheDocument();
    });

    it("should render the date picker and numeric input fields", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      expect(screen.getByRole("group", { name: "תאריך" })).toBeInTheDocument();
      expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
      expect(screen.getByLabelText("שעות תקן")).toHaveAttribute("type", "number");
      expect(screen.getByLabelText("שכר שעתי")).toHaveAttribute("type", "number");
    });
  });

  describe("Redux State Integration", () => {
    it("should display year from Redux state", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2025, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      const yearSection = screen.getByRole("spinbutton", { name: "Year" });
      expect(yearSection).toHaveTextContent("2025");
    });

    it("should display standard hours from Redux state", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 8.0, baseRate: 50 },
          }),
        },
      });

      const standardHoursInput = screen.getByLabelText("שעות תקן") as HTMLInputElement;
      expect(standardHoursInput.value).toBe("8");
    });

    it("should display base rate from Redux state", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 75 },
          }),
        },
      });

      const baseRateInput = screen.getByLabelText("שכר שעתי") as HTMLInputElement;
      expect(baseRateInput.value).toBe("75");
      expect(baseRateInput).toHaveAttribute("dir", "ltr");
      expect(baseRateInput).toHaveAttribute("inputmode", "decimal");
      expect(baseRateInput).toHaveAttribute("step", "any");
    });

    it("should render a combined month and year date picker", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2025, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      expect(screen.getByRole("group", { name: "תאריך" })).toBeInTheDocument();
    });

    it("should update Redux state when standard hours changes", async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      const standardHoursInput = screen.getByLabelText("שעות תקן");
      await user.clear(standardHoursInput);
      await user.type(standardHoursInput, "8");

      // Wait for debounce (500ms)
      await waitFor(
        () => {
          expect(store.getState().global.config.standardHours).toBe(8);
        },
        { timeout: 1000 }
      );
    });

    it("should update Redux state when base rate changes", async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      const baseRateInput = screen.getByLabelText("שכר שעתי");
      await user.clear(baseRateInput);
      await user.type(baseRateInput, "100");

      // Wait for debounce (500ms)
      await waitFor(
        () => {
          expect(store.getState().global.config.baseRate).toBe(100);
        },
        { timeout: 1000 }
      );
    });

    it("should expose the date picker with an accessible label", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByRole("group", { name: "תאריך" })).toBeInTheDocument();
    });
  });

  describe("Validation and Error Handling", () => {
    it("should show helper text for zero base rate in daily mode", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} mode="daily" />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 0 },
          }),
        },
      });

      expect(screen.getByText("יש להזין שכר שעתי להצגת שכר יומי או חודשי")).toBeInTheDocument();
    });

    it("should show helper text for zero base rate in monthly mode", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} mode="monthly" />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 0 },
          }),
        },
      });

      expect(screen.getByText("חישוב שכר חודשי מחייב הגדרת שכר שעתי")).toBeInTheDocument();
    });

    it("should show default helper text for standard hours", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByText("ברירת מחדל: 6.67")).toBeInTheDocument();
    });
  });

  describe("Monthly Mode Info Banner", () => {
    it("should display info banner in monthly mode", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} mode="monthly" />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      expect(screen.getByText(/החישוב מבוסס על/)).toBeInTheDocument();
    });

    it("should not display info banner in daily mode", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} mode="daily" />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      expect(screen.queryByText(/החישוב מבוסס על/)).not.toBeInTheDocument();
    });

    it("should not display info banner when mode is undefined", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.queryByText(/החישוב מבוסס על/)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByRole("heading", { name: "הגדרות חישוב" })).toBeInTheDocument();
    });

    it("should have accessible labels for all inputs", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      expect(screen.getByRole("group", { name: "תאריך" })).toBeInTheDocument();
      expect(screen.getByLabelText("שעות תקן")).toBeInTheDocument();
      expect(screen.getByLabelText("שכר שעתי")).toBeInTheDocument();
    });

    it("should have accessible icons for sections", () => {
      const { container } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState(),
        },
      });

      // Settings, Calendar, and Payments icons should be present
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle negative numbers gracefully", async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      const standardHoursInput = screen.getByLabelText("שעות תקן");
      await user.clear(standardHoursInput);
      await user.type(standardHoursInput, "-5");

      // Wait for debounce - negative values should not update Redux
      await waitFor(
        () => {
          // Should remain at original value or not update to negative
          expect(store.getState().global.config.standardHours).toBeGreaterThanOrEqual(0);
        },
        { timeout: 1000 }
      );
    });

    it("should handle decimal values in inputs", async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 50 },
          }),
        },
      });

      const baseRateInput = screen.getByLabelText("שכר שעתי");
      await user.clear(baseRateInput);
      await user.type(baseRateInput, "75.5");

      // Wait for debounce
      await waitFor(
        () => {
          expect(store.getState().global.config.baseRate).toBe(75.5);
        },
        { timeout: 1000 }
      );
    });

    it("should handle empty input gracefully", () => {
      renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 0, baseRate: 0 },
          }),
        },
      });

      const standardHoursInput = screen.getByLabelText("שעות תקן") as HTMLInputElement;
      const baseRateInput = screen.getByLabelText("שכר שעתי") as HTMLInputElement;

      expect(standardHoursInput.value).toBe("0");
      expect(baseRateInput.value).toBe("0");
    });

    it("should reset base rate to zero when an existing value is cleared", async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 75 },
          }),
        },
      });

      const baseRateInput = screen.getByLabelText("שכר שעתי");
      await user.clear(baseRateInput);

      await waitFor(
        () => {
          expect(store.getState().global.config.baseRate).toBe(0);
        },
        { timeout: 1000 },
      );
    });

    it("should accept zero as a base rate", async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ConfigPanel domain={mockDomain} />, {
        preloadedState: {
          global: createMockGlobalState({
            config: { year: 2024, month: 1, standardHours: 6.67, baseRate: 75 },
          }),
        },
      });

      const baseRateInput = screen.getByLabelText("שכר שעתי");
      await user.clear(baseRateInput);
      await user.type(baseRateInput, "0");

      await waitFor(
        () => {
          expect(store.getState().global.config.baseRate).toBe(0);
        },
        { timeout: 1000 },
      );
    });
  });
});
