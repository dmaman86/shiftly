import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import {
  ReferenceStatusContext,
  type ReferenceStatus,
} from "@/app/providers/domain/referenceStatusContext";
import { ReferenceDataNotice } from "@/features/reference/ReferenceDataNotice";
import { ReferenceIssueNotice } from "@/features/reference/ReferenceIssueNotice";

const status = (overrides: Partial<ReferenceStatus>): ReferenceStatus => ({
  source: { status: "fresh" },
  settled: true,
  error: null,
  retry: vi.fn(),
  retrying: false,
  ...overrides,
});

const renderNotice = (value: ReferenceStatus | null) =>
  render(
    <ReferenceStatusContext.Provider value={value}>
      <ReferenceDataNotice />
    </ReferenceStatusContext.Provider>,
  );

describe("ReferenceDataNotice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each<[string, ReferenceStatus | null]>([
    ["fresh rates", status({})],
    [
      "a request still running",
      status({
        settled: false,
        source: { status: "baseline", reason: "pending" },
      }),
    ],
    ["an overridden domain", null],
  ])("shows nothing for %s", (_, value) => {
    const { container } = renderNotice(value);
    expect(container).toBeEmptyDOMElement();
  });

  it("says when rates come from saved data, with its date", () => {
    renderNotice(
      status({
        source: {
          status: "stale",
          fetchedAt: "2026-10-20T08:00:00.000Z",
          reason: "network",
        },
      }),
    );

    const alert = screen.getByTestId("reference-data-stale");
    expect(alert).toHaveTextContent(/based on data saved on/i);
    expect(alert).toHaveTextContent(/2026/);
  });

  it("says when the rates included in the app are used", () => {
    renderNotice(
      status({ source: { status: "baseline", reason: "invalid_response" } }),
    );

    expect(screen.getByTestId("reference-data-baseline")).toHaveTextContent(
      /rates included in the app/i,
    );
  });

  it("shows a request error as an error, with a retry", () => {
    const retry = vi.fn();
    renderNotice(
      status({
        error: new Error("Request failed"),
        source: { status: "baseline", reason: "pending" },
        retry,
      }),
    );

    expect(screen.getByTestId("reference-data-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("ReferenceIssueNotice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("names the unavailable rates and why", () => {
    render(
      <ReferenceIssueNotice
        issues={[
          { key: "perDiemPointRate", on: "2024-06-01", reason: "not_covered" },
          {
            key: "mealAllowanceRates",
            on: "2024-06-01",
            reason: "not_covered",
          },
        ]}
      />,
    );

    const alert = screen.getByTestId("reference-issue");
    expect(alert).toHaveTextContent(/not calculated/i);
    expect(alert).toHaveTextContent(/per diem, meal allowance/i);
    expect(alert).toHaveTextContent(/no published rate covers this month/i);
  });

  it("shows nothing without issues", () => {
    const { container } = render(<ReferenceIssueNotice issues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
