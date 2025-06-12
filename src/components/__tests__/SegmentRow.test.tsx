import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";
import { addMinutes } from "date-fns";

import { SegmentRow } from "../SegmentRow";
import { WorkDayStatus } from "@/constants";

vi.mock("@mui/x-date-pickers/TimeField", () => ({
  TimeField: ({ label, value, onChange }: any) => (
    <input
      type="time"
      aria-label={label}
      value={value?.toISOString().substring(11, 16)}
      onChange={(e) => {
        const [h, m] = e.target.value.split(":").map(Number);
        const newDate = new Date();
        newDate.setHours(h);
        newDate.setMinutes(m);
        onChange?.(newDate);
      }}
    />
  ),
}));

const baseDate = new Date("2025-06-08T10:00:00");

const mockSegment = {
  id: "s1",
  start: { date: baseDate, minutes: 600 }, // 10:00 AM
  end: { date: addMinutes(baseDate, 30), minutes: 630 }, // 10:30 AM
};

const setup = (overrides = {}) => {
  const updateSegment = vi.fn();
  const removeSegment = vi.fn();

  render(
    <SegmentRow
      segment={mockSegment}
      status={WorkDayStatus.normal}
      updateSegment={updateSegment}
      removeSegment={removeSegment}
      isEditable={true}
      {...overrides}
    />,
  );
  return { updateSegment, removeSegment };
};

describe("SegmentRow", () => {
  it("renders editable time inputs initially", () => {
    setup();
    expect(screen.getByLabelText("שעת כניסה")).toBeInTheDocument();
    expect(screen.getByLabelText("שעת יציאה")).toBeInTheDocument();
  });

  it("shows warning if end < start and not cross-day", () => {
    const badSegment = {
      ...mockSegment,
      end: { date: mockSegment.start.date, minutes: 500 },
    };

    setup({ segment: badSegment });

    expect(
      screen.getByLabelText("יש לסמן חוצה יום - שעת סיום לפני שעת התחלה"),
    ).toBeInTheDocument();
  });

  it("does not allow save when end < start and not cross-day", async () => {
    const badSegment = {
      ...mockSegment,
      end: { date: mockSegment.start.date, minutes: 500 },
    };

    const { updateSegment } = setup({ segment: badSegment });

    const saveBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector('svg[data-testid="SaveIcon"]'));
    expect(saveBtn).toBeDisabled();
    expect(updateSegment).not.toHaveBeenCalled();
  });

  it("toggles cross-day checkbox and adjusts end time", async () => {
    const { updateSegment } = setup();

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox); // active "חוצה יום"

    const saveBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector('svg[data-testid="SaveIcon"]'));

    expect(saveBtn).toBeDefined();
    if (saveBtn) await userEvent.click(saveBtn);

    expect(updateSegment).toHaveBeenCalledWith(
      "s1",
      expect.any(Object),
      expect.objectContaining({
        minutes: 2070, // 630 + 1440
      }),
    );
  });

  it("renders as readonly after save", async () => {
    setup();
    const saveBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector('svg[data-testid="SaveIcon"]'));

    expect(saveBtn).toBeDefined();
    if (saveBtn) await userEvent.click(saveBtn);

    expect(screen.getByDisplayValue("10:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10:30")).toBeInTheDocument();
  });

  it("allows editing again after clicking ערוך", async () => {
    setup();
    const saveBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector('svg[data-testid="SaveIcon"]'));
    await userEvent.click(saveBtn!);

    const editBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector('svg[data-testid="EditIcon"]'));
    await userEvent.click(editBtn!);

    expect(screen.getByLabelText("שעת כניסה")).toBeInTheDocument();
  });

  it("calls removeSegment on delete", async () => {
    const { removeSegment } = setup();
    const deleteBtn = screen.getByRole("button", { name: /מחק/i });
    await userEvent.click(deleteBtn);
    expect(removeSegment).toHaveBeenCalledWith("s1");
  });
});
