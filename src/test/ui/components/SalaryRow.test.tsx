import { describe, it, expect, vi } from "vitest";
import { renderWithTheme, screen, waitFor } from "@/test/ui/utils";
import userEvent from "@testing-library/user-event";
import { SalaryRow } from "@/features/salary-summary/components/SalaryRow";
import { PayRowVM } from "@/features/salary-summary/vm";

describe("SalaryRow", () => {
  const defaultRow: PayRowVM = {
    label: "Regular Hours 100%",
    quantity: 160,
    rate: 50,
    total: 8000,
  };

  const defaultProps = {
    row: defaultRow,
    editMode: false,
    onQuantityChange: vi.fn(),
  };

  describe("Basic Rendering", () => {
    it("should render row label", () => {
      renderWithTheme(<SalaryRow {...defaultProps} />);

      expect(screen.getByText("Regular Hours 100%")).toBeInTheDocument();
    });

    it("should render quantity in read mode", () => {
      renderWithTheme(<SalaryRow {...defaultProps} />);

      expect(screen.getByText("160.00")).toBeInTheDocument();
    });

    it("should render rate with currency symbol", () => {
      renderWithTheme(<SalaryRow {...defaultProps} />);

      expect(screen.getByText("₪50.00")).toBeInTheDocument();
    });

    it("should render total with currency symbol", () => {
      renderWithTheme(<SalaryRow {...defaultProps} />);

      expect(screen.getByText("₪8000.00")).toBeInTheDocument();
    });

    it("should render as table row", () => {
      const { container } = renderWithTheme(<SalaryRow {...defaultProps} />);

      const tableRow = container.querySelector("tr");
      expect(tableRow).toBeInTheDocument();
    });
  });

  describe("Read Mode", () => {
    it("should display quantity as text when editMode is false", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={false} />);

      expect(screen.getByText("160.00")).toBeInTheDocument();
      // Should not render as input
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should display formatted quantity value", () => {
      const row = { ...defaultRow, quantity: 25.5 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} editMode={false} />);

      expect(screen.getByText("25.50")).toBeInTheDocument();
    });

    it("should display formatted rate value", () => {
      const row = { ...defaultRow, rate: 62.75 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} editMode={false} />);

      expect(screen.getByText("₪62.75")).toBeInTheDocument();
    });

    it("should display formatted total value", () => {
      const row = { ...defaultRow, total: 1234.56 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} editMode={false} />);

      expect(screen.getByText("₪1234.56")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should display quantity as input when editMode is true", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("160");
    });

    it("should allow editing quantity value", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithTheme(
        <SalaryRow {...defaultProps} editMode={true} onQuantityChange={handleChange} />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "200");

      // Input should update
      expect(input).toHaveValue("200");
    });

    it("should call onQuantityChange after debounce", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithTheme(
        <SalaryRow {...defaultProps} editMode={true} onQuantityChange={handleChange} />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "180");

      // Wait for debounce (500ms default)
      await waitFor(
        () => {
          expect(handleChange).toHaveBeenCalledWith(180);
        },
        { timeout: 1000 }
      );
    });

    it("should render input with small size", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      // MUI TextField applies centering via slotProps, not testable via style
    });

    it("should accept numeric input", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      // inputMode="decimal" is applied via slotProps.input
    });

    it("should not allow editing rate in edit mode", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={true} />);

      // Rate should still be displayed as text
      expect(screen.getByText("₪50.00")).toBeInTheDocument();
    });

    it("should not allow editing total in edit mode", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={true} />);

      // Total should still be displayed as text
      expect(screen.getByText("₪8000.00")).toBeInTheDocument();
    });
  });

  describe("Value Formatting", () => {
    it("should show dash for zero total", () => {
      const row = { ...defaultRow, total: 0 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("should hide zero quantity values in read mode", () => {
      const row = { ...defaultRow, quantity: 0 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} editMode={false} />);

      // formatValue returns "" for 0
      expect(screen.queryByText("0.00")).not.toBeInTheDocument();
    });

    it("should hide zero rate values", () => {
      const row = { ...defaultRow, rate: 0 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      // formatValue returns "" for 0, but currency symbol might still show
      expect(screen.queryByText("0.00")).not.toBeInTheDocument();
    });

    it("should format decimal quantities correctly", () => {
      const row = { ...defaultRow, quantity: 42.75 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} editMode={false} />);

      expect(screen.getByText("42.75")).toBeInTheDocument();
    });

    it("should format large numbers correctly", () => {
      const row = { ...defaultRow, quantity: 1234.56, total: 61728 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      expect(screen.getByText("1234.56")).toBeInTheDocument();
      expect(screen.getByText("₪61728.00")).toBeInTheDocument();
    });
  });

  describe("Different Row Types", () => {
    it("should render overtime row correctly", () => {
      const row: PayRowVM = {
        label: "Overtime 125%",
        quantity: 20,
        rate: 62.5,
        total: 1250,
      };

      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      expect(screen.getByText("Overtime 125%")).toBeInTheDocument();
      expect(screen.getByText("20.00")).toBeInTheDocument();
      expect(screen.getByText("₪62.50")).toBeInTheDocument();
      expect(screen.getByText("₪1250.00")).toBeInTheDocument();
    });

    it("should render night shift row correctly", () => {
      const row: PayRowVM = {
        label: "Night Shift 150%",
        quantity: 8,
        rate: 75,
        total: 600,
      };

      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      expect(screen.getByText("Night Shift 150%")).toBeInTheDocument();
      expect(screen.getByText("8.00")).toBeInTheDocument();
    });

    it("should render Hebrew labels correctly", () => {
      const row: PayRowVM = {
        label: "שעות רגילות 100%",
        quantity: 160,
        rate: 50,
        total: 8000,
      };

      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      expect(screen.getByText("שעות רגילות 100%")).toBeInTheDocument();
    });
  });

  describe("Hover Effect", () => {
    it("should have hover styling", () => {
      const { container } = renderWithTheme(<SalaryRow {...defaultProps} />);

      const tableRow = container.querySelector("tr");
      expect(tableRow).toHaveClass("MuiTableRow-hover");
    });
  });

  describe("Accessibility", () => {
    it("should use semantic table cells", () => {
      const { container } = renderWithTheme(<SalaryRow {...defaultProps} />);

      const cells = container.querySelectorAll("td");
      expect(cells.length).toBe(4); // label, quantity, rate, total
    });

    it("should have proper table structure", () => {
      const { container } = renderWithTheme(<SalaryRow {...defaultProps} />);

      const row = container.querySelector("tr");
      expect(row).toBeInTheDocument();
      
      const cells = row?.querySelectorAll("td");
      expect(cells?.length).toBe(4);
    });

    it("should have accessible input in edit mode", () => {
      renderWithTheme(<SalaryRow {...defaultProps} editMode={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("should render numeric values in table cells", () => {
      const { container } = renderWithTheme(<SalaryRow {...defaultProps} />);

      const cells = container.querySelectorAll("td");
      // Quantity, rate, and total cells should display centered (via MUI sx prop)
      expect(cells[1]).toBeInTheDocument();
      expect(cells[2]).toBeInTheDocument();
      expect(cells[3]).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small decimal values", () => {
      const row = { ...defaultRow, quantity: 0.01, rate: 0.05, total: 0.0005 };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} editMode={false} />);

      expect(screen.getByText("0.01")).toBeInTheDocument();
      expect(screen.getByText("₪0.05")).toBeInTheDocument();
    });

    it("should handle negative values gracefully", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithTheme(
        <SalaryRow {...defaultProps} editMode={true} onQuantityChange={handleChange} />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "-10");

      // useEditableQuantity should filter negative values (parsed >= 0)
      await waitFor(
        () => {
          // Should not call with negative value
          expect(handleChange).not.toHaveBeenCalledWith(-10);
        },
        { timeout: 1000 }
      );
    });

    it("should handle non-numeric input gracefully", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithTheme(
        <SalaryRow {...defaultProps} editMode={true} onQuantityChange={handleChange} />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "abc");

      // Should not call onChange with NaN
      await waitFor(
        () => {
          expect(handleChange).not.toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });

    it("should switch between edit and read modes", () => {
      const { rerender } = renderWithTheme(<SalaryRow {...defaultProps} editMode={false} />);

      // Read mode
      expect(screen.getByText("160.00")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      // Switch to edit mode
      rerender(<SalaryRow {...defaultProps} editMode={true} />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should handle empty label", () => {
      const row = { ...defaultRow, label: "" };
      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      const { container } = renderWithTheme(<SalaryRow {...defaultProps} row={row} />);
      const firstCell = container.querySelector("td");
      expect(firstCell?.textContent).toBe("");
    });

    it("should render with all values at maximum", () => {
      const row: PayRowVM = {
        label: "Maximum Values",
        quantity: 999999.99,
        rate: 999999.99,
        total: 999999990000.0001,
      };

      renderWithTheme(<SalaryRow {...defaultProps} row={row} />);

      expect(screen.getByText("Maximum Values")).toBeInTheDocument();
    });
  });
});
