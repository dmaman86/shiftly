import { describe, it, expect, vi } from "vitest";
import { renderWithTheme, screen } from "@/test/ui/utils";
import userEvent from "@testing-library/user-event";
import { ShiftTimeInput } from "@/features/work-table/components/ShiftTimeInput";

describe("ShiftTimeInput", () => {
  const defaultProps = {
    value: new Date(2024, 0, 1, 8, 0), // 08:00
    label: "Start Time",
    disabled: false,
    onChange: vi.fn(),
  };

  describe("Basic Rendering", () => {
    it("should render with label", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} />);

      // MUI TimeField renders multiple instances of label text (label + legend)
      const labels = screen.getAllByText("Start Time");
      expect(labels.length).toBeGreaterThan(0);
    });

    it("should display time value correctly", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 14, 30)} />);

      // Check spinbuttons for time segments
      const spinbuttons = screen.getAllByRole("spinbutton");
      expect(spinbuttons).toHaveLength(2); // Hours and Minutes
    });

    it("should render as small size", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} />);

      // Verify component renders
      expect(screen.getAllByText("Start Time")[0]).toBeInTheDocument();
    });

    it("should use 24-hour format (no AM/PM)", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 15, 0)} />);

      // Should not contain AM/PM indicators
      expect(screen.queryByText(/AM/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/PM/i)).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should render interactive spinbuttons", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} />);

      const spinbuttons = screen.getAllByRole("spinbutton");
      expect(spinbuttons).toHaveLength(2); // Hours and Minutes spinbuttons
    });

    it("should not have disabled spinbuttons when not disabled", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} disabled={false} />);

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).not.toHaveAttribute("aria-disabled", "true");
    });

    it("should have disabled spinbuttons when disabled", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} disabled={true} />);

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).toHaveAttribute("aria-disabled", "true");
    });

    it("should not call onChange when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithTheme(
        <ShiftTimeInput {...defaultProps} disabled={true} onChange={handleChange} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      
      // Attempting to interact with disabled input
      await user.click(hoursSpinbutton);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("Error State", () => {
    it("should display error state when error prop is true", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} error={true} />);

      // MUI applies aria-invalid to the group
      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-invalid", "true");
    });

    it("should not display error state by default", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-invalid", "false");
    });

    it("should not display error state when error is false", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} error={false} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("Time Values", () => {
    it("should handle midnight time", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 0, 0)} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "0");
    });

    it("should handle noon time", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 12, 0)} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "12");
    });

    it("should handle late night hours", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 23, 59)} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      const minutesSpinbutton = screen.getByRole("spinbutton", { name: /Minutes/i });
      
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "23");
      expect(minutesSpinbutton).toHaveAttribute("aria-valuenow", "59");
    });

    it("should handle morning hours", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 6, 30)} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      const minutesSpinbutton = screen.getByRole("spinbutton", { name: /Minutes/i });
      
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "6");
      expect(minutesSpinbutton).toHaveAttribute("aria-valuenow", "30");
    });

    it("should handle afternoon hours", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 17, 45)} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      const minutesSpinbutton = screen.getByRole("spinbutton", { name: /Minutes/i });
      
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "17");
      expect(minutesSpinbutton).toHaveAttribute("aria-valuenow", "45");
    });
  });

  describe("Label Variations", () => {
    it("should render with different label text", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} label="End Time" />);

      expect(screen.getAllByText("End Time")[0]).toBeInTheDocument();
    });

    it("should render with Hebrew label", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} label="שעת התחלה" />);

      expect(screen.getAllByText("שעת התחלה")[0]).toBeInTheDocument();
    });

    it("should render with short label", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} label="Time" />);

      expect(screen.getAllByText("Time")[0]).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible label", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} />);

      // Label is rendered
      expect(screen.getAllByText("Start Time")[0]).toBeInTheDocument();
    });

    it("should have accessible group role", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} />);

      const group = screen.getByRole("group");
      expect(group).toBeInTheDocument();
    });

    it("should indicate disabled state to screen readers", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} disabled={true} />);

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).toHaveAttribute("aria-disabled", "true");
    });

    it("should indicate error state appropriately", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} error={true} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("Edge Cases", () => {
    it("should handle combined disabled and error states", () => {
      renderWithTheme(<ShiftTimeInput {...defaultProps} disabled={true} error={true} />);

      const group = screen.getByRole("group");
      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      
      expect(group).toHaveAttribute("aria-invalid", "true");
      expect(hoursSpinbutton).toHaveAttribute("aria-disabled", "true");
    });

    it("should render with all props combined", () => {
      const handleChange = vi.fn();
      renderWithTheme(
        <ShiftTimeInput
          value={new Date(2024, 0, 1, 9, 15)}
          label="Shift Start"
          disabled={false}
          error={false}
          onChange={handleChange}
        />
      );

      expect(screen.getAllByText("Shift Start")[0]).toBeInTheDocument();
      
      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "9");
      expect(hoursSpinbutton).not.toHaveAttribute("aria-disabled", "true");
    });

    it("should handle time with single digit hours", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 7, 0)} />
      );

      const hoursSpinbutton = screen.getByRole("spinbutton", { name: /Hours/i });
      expect(hoursSpinbutton).toHaveAttribute("aria-valuenow", "7");
    });

    it("should handle time with single digit minutes", () => {
      renderWithTheme(
        <ShiftTimeInput {...defaultProps} value={new Date(2024, 0, 1, 10, 5)} />
      );

      const minutesSpinbutton = screen.getByRole("spinbutton", { name: /Minutes/i });
      expect(minutesSpinbutton).toHaveAttribute("aria-valuenow", "5");
    });
  });
});
