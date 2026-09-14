import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";

import { CollapsibleCard } from "@/components";
import { renderWithTheme, screen } from "@/test/ui/utils";

describe("CollapsibleCard", () => {
  it("starts collapsed and expands through its accessible toggle", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <CollapsibleCard
        detailsId="details"
        regionLabel="Details"
        expandedLabel="Hide details"
        collapsedLabel="Show details"
        header={<span>Summary</span>}
        collapsibleContent={<span>Hidden content</span>}
      >
        <span>Visible content</span>
      </CollapsibleCard>,
    );

    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Details" })).toHaveTextContent(
      "Hidden content",
    );
  });

  it("toggles with Enter from the header", async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <CollapsibleCard
        detailsId="keyboard-details"
        regionLabel="Keyboard details"
        expandedLabel="Hide"
        collapsedLabel="Show"
        header={<span>Keyboard summary</span>}
        collapsibleContent={<>Keyboard content</>}
      >
        Always visible
      </CollapsibleCard>,
    );

    const header = screen.getByRole("button", { name: "Keyboard summary" });
    header.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("region", { name: "Keyboard details" })).toHaveTextContent(
      "Keyboard content",
    );
  });
});
