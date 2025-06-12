import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { WorkDayRow } from "../WorkDayRow";
import { WorkDayType } from "@/constants";

const baseProps = {
  meta: {
    date: "2025-05-01",
    typeDay: WorkDayType.Regular,
    crossDayContinuation: false,
  },
  hebrewDay: "א",
  baseRate: 50,
  standardHours: 6.67,
  addToGlobalBreakdown: vi.fn(),
  subtractFromGlobalBreakdown: vi.fn(),
};

const setup = (overrides = {}) => {
  return render(
    <table>
      <tbody>
        <WorkDayRow {...baseProps} {...overrides} />
      </tbody>
    </table>,
  );
};

const getActiveInput = (inputs: HTMLElement[]) => {
  return inputs.find(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-disabled") !== "true",
  );
};

describe("WorkDayRow", () => {
  it("renders the day number and checkboxes", () => {
    setup();
    expect(screen.getByText("א-01")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("does not render checkboxes for SpecialFull day", () => {
    setup({
      meta: { ...baseProps.meta, typeDay: WorkDayType.SpecialFull },
    });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("adds a sick segment when sick checkbox is checked", async () => {
    const user = userEvent.setup();

    setup();
    const row = screen.getByText("א-01").closest("tr");
    expect(row).not.toBeNull();

    const checkboxes = within(row!).getAllByRole("checkbox");
    const sickCheckbox = checkboxes[0];

    await user.click(sickCheckbox);

    const startInputs = await within(row!).findAllByLabelText("שעת כניסה");
    const endInputs = await within(row!).findAllByLabelText("שעת יציאה");

    const startInput = getActiveInput(startInputs);
    const endInput = getActiveInput(endInputs);

    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();
  });

  it("adds a segment when " + " button is clicked", async () => {
    setup();

    const addBtn = screen.getByRole("button");
    await userEvent.click(addBtn);

    const inputs = await screen.findAllByLabelText("שעת כניסה");
    const startInput = getActiveInput(inputs);

    expect(startInput).toBeInTheDocument();
  });

  it("calls addToGlobalBreakdown when breakdown changes", async () => {
    const addMock = vi.fn();
    const subtractMock = vi.fn();

    setup({
      addToGlobalBreakdown: addMock,
      subtractFromGlobalBreakdown: subtractMock,
    });

    const row = screen.getByText("א-01").closest("tr");
    expect(row).not.toBeNull();

    const [sickCheckbox] = within(row!).getAllByRole("checkbox");
    await userEvent.click(sickCheckbox);

    const inputs = await within(row!).findAllByLabelText("שעת כניסה");
    const activeInput = getActiveInput(inputs);

    expect(activeInput).toBeInTheDocument();
    expect(addMock).toHaveBeenCalled();
  });

  it("calls subtractFromGlobalBreakdown when segment is removed", async () => {
    const addMock = vi.fn();
    const subtractMock = vi.fn();

    setup({
      addToGlobalBreakdown: addMock,
      subtractFromGlobalBreakdown: subtractMock,
    });

    const row = screen.getByText("א-01").closest("tr");
    expect(row).not.toBeNull();

    const [sickCheckbox] = within(row!).getAllByRole("checkbox");

    await userEvent.click(sickCheckbox); // add
    await userEvent.click(sickCheckbox); // remove

    expect(subtractMock).toHaveBeenCalled();
  });
});
