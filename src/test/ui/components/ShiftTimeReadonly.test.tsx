import { describe, it, expect } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import { ShiftTimeReadonly } from "@/features/work-table/components/ShiftTimeReadonly";

describe("ShiftTimeReadonly", () => {
  describe("Basic Rendering", () => {
    it("should render label correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Start Time" minutes={480} />);

      expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
    });

    it("should display time in HH:MM format", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={480} />);

      const input = screen.getByDisplayValue("08:00");
      expect(input).toBeInTheDocument();
    });

    it("should render as readonly input", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={480} />);

      const input = screen.getByLabelText("Time");
      expect(input).toHaveAttribute("readonly");
    });

    it("should have small size styling", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={480} />);

      const input = screen.getByLabelText("Time");
      expect(input).toBeInTheDocument();
    });
  });

  describe("Time Formatting", () => {
    it("should format midnight correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Midnight" minutes={0} />);

      expect(screen.getByDisplayValue("00:00")).toBeInTheDocument();
    });

    it("should format morning time correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Morning" minutes={540} />);

      expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
    });

    it("should format noon correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Noon" minutes={720} />);

      expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
    });

    it("should format afternoon time correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Afternoon" minutes={900} />);

      expect(screen.getByDisplayValue("15:00")).toBeInTheDocument();
    });

    it("should format evening time correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Evening" minutes={1140} />);

      expect(screen.getByDisplayValue("19:00")).toBeInTheDocument();
    });

    it("should format late night time correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Late Night" minutes={1380} />);

      expect(screen.getByDisplayValue("23:00")).toBeInTheDocument();
    });

    it("should handle minutes with remainder correctly", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={525} />);

      expect(screen.getByDisplayValue("08:45")).toBeInTheDocument();
    });

    it("should pad single digit hours with zero", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={60} />);

      expect(screen.getByDisplayValue("01:00")).toBeInTheDocument();
    });

    it("should pad single digit minutes with zero", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={485} />);

      expect(screen.getByDisplayValue("08:05")).toBeInTheDocument();
    });
  });

  describe("Cross-Day Time Handling", () => {
    it("should handle time beyond 24 hours (cross-day)", () => {
      // 1500 minutes = 25 hours = wraps to 01:00 next day
      renderWithTheme(<ShiftTimeReadonly label="Cross Day" minutes={1500} />);

      expect(screen.getByDisplayValue("01:00")).toBeInTheDocument();
    });

    it("should handle exactly 24 hours (full day)", () => {
      renderWithTheme(<ShiftTimeReadonly label="Full Day" minutes={1440} />);

      expect(screen.getByDisplayValue("00:00")).toBeInTheDocument();
    });

    it("should handle 48+ hours correctly", () => {
      // 3000 minutes = 50 hours = wraps to 02:00 (modulo 24)
      renderWithTheme(<ShiftTimeReadonly label="Two Days" minutes={3000} />);

      expect(screen.getByDisplayValue("02:00")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero minutes", () => {
      renderWithTheme(<ShiftTimeReadonly label="Zero" minutes={0} />);

      expect(screen.getByDisplayValue("00:00")).toBeInTheDocument();
    });

    it("should handle end of day time", () => {
      renderWithTheme(<ShiftTimeReadonly label="End of Day" minutes={1439} />);

      expect(screen.getByDisplayValue("23:59")).toBeInTheDocument();
    });

    it("should handle 30-minute increments", () => {
      renderWithTheme(<ShiftTimeReadonly label="Half Hour" minutes={570} />);

      expect(screen.getByDisplayValue("09:30")).toBeInTheDocument();
    });

    it("should handle 15-minute increments", () => {
      renderWithTheme(<ShiftTimeReadonly label="Quarter Hour" minutes={495} />);

      expect(screen.getByDisplayValue("08:15")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible label", () => {
      renderWithTheme(<ShiftTimeReadonly label="Start Time" minutes={480} />);

      const input = screen.getByLabelText("Start Time");
      expect(input).toBeInTheDocument();
    });

    it("should be focusable for screen readers", () => {
      renderWithTheme(<ShiftTimeReadonly label="Time" minutes={480} />);

      const input = screen.getByLabelText("Time");
      expect(input).toBeInTheDocument();
      // Readonly inputs are still focusable
      expect(input).not.toBeDisabled();
    });

    it("should display formatted time for screen readers", () => {
      renderWithTheme(<ShiftTimeReadonly label="Work Start" minutes={540} />);

      const input = screen.getByLabelText("Work Start");
      expect(input).toHaveValue("09:00");
    });
  });
});
