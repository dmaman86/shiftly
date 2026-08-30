import { useState } from "react";
import { describe, expect, it } from "vitest";

import { WorkDayStatus } from "@/constants";
import {
  useWorkTableDayState,
} from "@/features/work-table/hooks/useWorkTableDayState";
import { WorkTableDayStateProvider } from "@/features/work-table/components/WorkTableDayStateProvider";
import { renderPure, screen, userEvent } from "@/test/ui/utils";

const dateKey = "2026-08-26";

const DesktopDayEditor = () => {
  const { status, shiftEntries, setStatus, setShiftEntries } =
    useWorkTableDayState(dateKey);

  const editDay = () => {
    const time = new Date(`${dateKey}T08:00:00`);

    setStatus(WorkDayStatus.sick);
    setShiftEntries({
      shift: {
        shift: {
          id: "shift",
          start: { date: time },
          end: { date: time },
          isDuty: false,
        },
        payMap: null,
      },
    });
  };

  return (
    <div>
      <span>{`desktop:${status}:${Object.keys(shiftEntries).length}`}</span>
      <button type="button" onClick={editDay}>
        Edit day
      </button>
    </div>
  );
};

const MobileDayEditor = () => {
  const { status, shiftEntries } = useWorkTableDayState(dateKey);

  return <span>{`mobile:${status}:${Object.keys(shiftEntries).length}`}</span>;
};

const ResponsiveWorkTableHarness = () => {
  const [isMobile, setIsMobile] = useState(false);

  return (
    <WorkTableDayStateProvider>
      <button type="button" onClick={() => setIsMobile((value) => !value)}>
        Change layout
      </button>
      {isMobile ? <MobileDayEditor /> : <DesktopDayEditor />}
    </WorkTableDayStateProvider>
  );
};

describe("WorkTableDayStateProvider", () => {
  it("preserves a day's editing state when its responsive view is replaced", async () => {
    renderPure(<ResponsiveWorkTableHarness />);

    expect(screen.getByText("desktop:normal:0")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit day" }));
    expect(screen.getByText("desktop:sick:1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Change layout" }),
    );

    expect(screen.getByText("mobile:sick:1")).toBeInTheDocument();
  });
});
