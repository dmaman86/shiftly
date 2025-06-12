import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import userEvent from "@testing-library/user-event";
import { ConfigPanel } from "../ConfigPanel";
import { vi } from "vitest";

const setup = (overrides = {}) => {
  const onChange = vi.fn();
  const values = {
    year: 2025,
    month: 5,
    standardHours: 6.67,
    baseRate: 50,
    ...overrides,
  };

  render(<ConfigPanel values={values} onChange={onChange} />);
  return { onChange };
};

describe("ConfigPanel", () => {
  it("renders all inputs with correct values", () => {
    setup();

    expect(screen.getByLabelText("שנה")).toHaveValue(2025);
    expect(screen.getByLabelText("שעות תקן")).toHaveValue(6.67);
    expect(screen.getByLabelText("שכר שעתי")).toHaveValue(50);
    expect(screen.getByLabelText("חודש")).toBeInTheDocument();
  });

  it("calls onChange when year changes and resets month", () => {
    const { onChange } = setup({ year: 2024 });

    const yearInput = screen.getByLabelText("שנה");
    fireEvent.change(yearInput, { target: { value: "2023" } });

    expect(onChange).toHaveBeenCalledWith("year", 2023);
    expect(onChange).toHaveBeenCalledWith("month", 1);
  });

  it("calls onChange when month is selected", async () => {
    const { onChange } = setup({ year: new Date().getFullYear() });

    const monthSelect = screen.getByLabelText("חודש");
    await userEvent.click(monthSelect);

    const option = await screen.findByRole("option", { name: "ינואר" });

    await userEvent.click(option);
    expect(onChange).toHaveBeenCalledWith("month", 1);
  });

  it("shows correct helper text for baseRate = 0", () => {
    setup({ baseRate: 0 });

    expect(
      screen.getByText("יש להזין שכר שעתי להצגת שכר יומי או חודשי"),
    ).toBeInTheDocument();
  });

  it("disables month selector if no months available", () => {
    setup({ year: 3000 });

    const monthSelect = screen.getByLabelText("חודש");
    expect(monthSelect).toHaveAttribute("aria-disabled", "true");
  });
});
