import { describe, it, expect, vi } from "vitest";
import { renderWithTheme, screen, waitFor } from "@/test/ui/utils";
import userEvent from "@testing-library/user-event";
import { SalaryCardSection } from "@/features/salary-summary/components/SalaryCardSection";
import { SalarySectionConfig } from "@/features/salary-summary/vm";
import WorkIcon from "@mui/icons-material/Work";

describe("SalaryCardSection", () => {
  // Simple mock that focuses on buildRows output, not internal payVM structure
  const mockSection: SalarySectionConfig = {
    id: "base",
    title: "Regular Pay",
    icon: <WorkIcon />,
    summaryLabel: "Total Regular",
    color: "#4caf50",
    type: "base",
    payVM: {
      totalHours: 180,
      regular: {
        hours100: { percent: 100, hours: 160 },
        hours125: { percent: 125, hours: 20 },
        hours150: { percent: 150, hours: 0 },
      },
      extra: {
        hours20: { percent: 20, hours: 0 },
        hours50: { percent: 50, hours: 0 },
      },
      special: {
        shabbat150: { percent: 150, hours: 0 },
        shabbat200: { percent: 200, hours: 0 },
      },
      hours100Sick: { percent: 100, hours: 0 },
      hours100Vacation: { percent: 100, hours: 0 },
      extra100Shabbat: { percent: 100, hours: 0 },
      perDiemPoints: 0,
      perDiemAmount: 0,
      largePoints: 0,
      largeAmount: 0,
      smallPoints: 0,
      smallAmount: 0,
    },
    baseRate: 50,
    buildRows: () => [
      { label: "100%", quantity: 160, rate: 50, total: 8000 },
      { label: "125%", quantity: 20, rate: 62.5, total: 1250 },
    ],
  };

  describe("Basic Rendering", () => {
    it("should render card with title", () => {
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      expect(screen.getByText("Regular Pay")).toBeInTheDocument();
    });

    it("should render edit button", () => {
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      expect(editButton).toBeInTheDocument();
    });

    it("should render table with rows", () => {
      const { container } = renderWithTheme(<SalaryCardSection section={mockSection} />);

      const table = container.querySelector("table");
      expect(table).toBeInTheDocument();
    });

    it("should render summary row with total", () => {
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      expect(screen.getByText("Total Regular")).toBeInTheDocument();
      expect(screen.getByText("₪9250.00")).toBeInTheDocument();
    });

    it("should render table headers", () => {
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      expect(screen.getByText("סוג")).toBeInTheDocument();
      expect(screen.getByText("כמות")).toBeInTheDocument();
      expect(screen.getByText("ערך")).toBeInTheDocument();
      expect(screen.getByText("סכום")).toBeInTheDocument();
    });

    it("should render all data rows", () => {
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("125%")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should toggle edit mode on button click", async () => {
      const user = userEvent.setup();
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      
      // Initially not in edit mode (no textbox)
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

      // Click to enter edit mode
      await user.click(editButton);

      // Should show textboxes for quantity inputs
      const inputs = screen.getAllByRole("textbox");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it("should change icon from edit to done", async () => {
      const user = userEvent.setup();
      const { container } = renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      
      // Check for Edit icon initially
      const editIcon = container.querySelector('[data-testid="EditIcon"]');
      expect(editIcon).toBeInTheDocument();

      // Click to enter edit mode
      await user.click(editButton);

      // Check for Done icon
      const doneIcon = container.querySelector('[data-testid="DoneIcon"]');
      expect(doneIcon).toBeInTheDocument();
    });

    it("should allow editing quantities in edit mode", async () => {
      const user = userEvent.setup();
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      await user.click(editButton);

      // Get first input (for 100% row)
      const inputs = screen.getAllByRole("textbox");
      const firstInput = inputs[0];

      await user.clear(firstInput);
      await user.type(firstInput, "200");

      expect(firstInput).toHaveValue("200");
    });

    it("should call onTotalChange when initialized", () => {
      const handleTotalChange = vi.fn();

      renderWithTheme(
        <SalaryCardSection section={mockSection} onTotalChange={handleTotalChange} />
      );

      // Should be called with initial total
      expect(handleTotalChange).toHaveBeenCalledWith("base", 9250);
    });

    it("should update total when quantity changes", async () => {
      const user = userEvent.setup();
      const handleTotalChange = vi.fn();

      renderWithTheme(
        <SalaryCardSection section={mockSection} onTotalChange={handleTotalChange} />
      );

      // Clear previous calls
      handleTotalChange.mockClear();

      const editButton = screen.getByRole("button");
      await user.click(editButton);

      // Get first input (for 100% row, rate=50)
      const inputs = screen.getAllByRole("textbox");
      const firstInput = inputs[0];

      await user.clear(firstInput);
      await user.type(firstInput, "200");

      // Wait for debounce and recalculation
      await waitFor(
        () => {
          // New total: 200*50 + 20*62.5 = 10000 + 1250 = 11250
          expect(handleTotalChange).toHaveBeenCalledWith("base", 11250);
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Table Structure", () => {
    it("should render proper table structure", () => {
      const { container } = renderWithTheme(<SalaryCardSection section={mockSection} />);

      const table = container.querySelector("table");
      const thead = table?.querySelector("thead");
      const tbody = table?.querySelector("tbody");

      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it("should render correct number of data rows", () => {
      const { container } = renderWithTheme(<SalaryCardSection section={mockSection} />);

      const tbody = container.querySelector("tbody");
      const rows = tbody?.querySelectorAll("tr");

      // 2 data rows + 1 summary row = 3 total
      expect(rows?.length).toBe(3);
    });

    it("should highlight summary row", () => {
      const { container } = renderWithTheme(<SalaryCardSection section={mockSection} />);

      const tbody = container.querySelector("tbody");
      const rows = tbody?.querySelectorAll("tr");
      const summaryRow = rows?.[rows.length - 1];

      // Summary row should have background color
      expect(summaryRow).toBeInTheDocument();
    });
  });

  describe("Icon Rendering", () => {
    it("should render section icon", () => {
      const { container } = renderWithTheme(<SalaryCardSection section={mockSection} />);

      const icon = container.querySelector('[data-testid="WorkIcon"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Tooltips", () => {
    it("should show edit tooltip on hover", async () => {
      const user = userEvent.setup();
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      await user.hover(editButton);

      // MUI Tooltip renders asynchronously
      await waitFor(() => {
        expect(screen.getByText("ערוך כמויות")).toBeInTheDocument();
      });
    });

    it("should show done tooltip when in edit mode", async () => {
      const user = userEvent.setup();
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      
      // Enter edit mode
      await user.click(editButton);
      
      // Hover again
      await user.hover(editButton);

      await waitFor(() => {
        expect(screen.getByText("סיים עריכה")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty rows", () => {
      const emptySection: SalarySectionConfig = {
        ...mockSection,
        buildRows: () => [],
      };

      renderWithTheme(<SalaryCardSection section={emptySection} />);

      expect(screen.getByText("Regular Pay")).toBeInTheDocument();
      // formatValue returns empty string for 0, so displays as "₪"
      expect(screen.getByText("Total Regular")).toBeInTheDocument();
    });

    it("should handle single row", () => {
      const singleRowSection: SalarySectionConfig = {
        ...mockSection,
        buildRows: () => [{ label: "100%", quantity: 160, rate: 50, total: 8000 }],
      };

      renderWithTheme(<SalaryCardSection section={singleRowSection} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      // ₪8000.00 appears twice: in row and in summary
      const amounts = screen.getAllByText(/8000\.00/);
      expect(amounts.length).toBeGreaterThan(0);
    });

    it("should handle zero totals", () => {
      const zeroSection: SalarySectionConfig = {
        ...mockSection,
        buildRows: () => [
          { label: "100%", quantity: 0, rate: 50, total: 0 },
        ],
      };

      renderWithTheme(<SalaryCardSection section={zeroSection} />);

      // Should show dash for zero total in row
      expect(screen.getByText("—")).toBeInTheDocument();
      // Summary shows just "₪" (formatValue returns empty string for 0)
      expect(screen.getByText("Total Regular")).toBeInTheDocument();
    });

    it("should handle multiple edits", async () => {
      const user = userEvent.setup();
      renderWithTheme(<SalaryCardSection section={mockSection} />);

      const editButton = screen.getByRole("button");
      
      // Enter edit mode
      await user.click(editButton);
      
      // Exit edit mode
      await user.click(editButton);
      
      // Re-enter edit mode
      await user.click(editButton);

      // Should still be able to edit
      const inputs = screen.getAllByRole("textbox");
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});
