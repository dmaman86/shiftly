import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { ElectionDataNotice } from "@/features/calendar/ElectionDataNotice";

describe("ElectionDataNotice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows nothing for fresh or not yet loaded election days", () => {
    const { container, rerender } = render(
      <ElectionDataNotice state={{ status: "fresh" }} retry={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<ElectionDataNotice state={undefined} retry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says when election days come from saved data, with its date", () => {
    render(
      <ElectionDataNotice
        state={{ status: "stale", fetchedAt: "2026-10-20T08:00:00.000Z" }}
        retry={vi.fn()}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/based on data saved on/i);
    expect(alert).toHaveTextContent(/2026/);
  });

  it("warns that the election premium may be missing and offers a retry", () => {
    const retry = vi.fn();
    render(<ElectionDataNotice state={{ status: "missing" }} retry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /election-day premium may be missing/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("disables the retry while it runs", () => {
    render(
      <ElectionDataNotice
        state={{ status: "missing" }}
        retry={vi.fn()}
        retrying
      />,
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeDisabled();
  });
});
