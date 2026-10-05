import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/i18n";
import { domain } from "@/app";
import { ExtraCalculator } from "@shiftly/domain";
import { monthToPayBreakdownVM } from "@/adapters";
import { buildExtraPayRows } from "@/features/salary-summary/mappers/payRows.mapper";
import { breakdownToDetailGroups } from "@/features/work-table/mappers/day/breakdownToDetailGroups";
import { WorkTablePrintView } from "@/features/work-table/components/month/WorkTablePrintView";
import { computeTotalPay } from "@/utils";

const viewModel = monthToPayBreakdownVM(
  {
    ...domain.payMap.monthPayMapCalculator.createEmpty(),
    extra: {
      ...new ExtraCalculator().createEmpty(),
      hours20: { percent: 0.2, hours: 2 },
      "evening:0.3": { percent: 0.3, hours: 2 },
      "night:0.3": { percent: 0.3, hours: 1 },
    },
  },
  0,
);

describe("addition rate presentation", () => {
  it.each(["en", "he"])(
    "shows actual rates and separate kind-specific rows in %s",
    (language) => {
      const t = i18n.getFixedT(language, "work-table");
      const rows = buildExtraPayRows(viewModel, 50, t);
      const evening = rows.find(({ id }) => id === "evening:0.3");
      const night = rows.find(({ id }) => id === "night:0.3");

      expect(evening).toMatchObject({
        label: t("pay_labels.evening", { percent: 30 }),
        quantity: 2,
        rate: 15,
        total: 30,
      });
      expect(night).toMatchObject({
        label: t("pay_labels.night", { percent: 30 }),
        quantity: 1,
        rate: 15,
        total: 15,
      });
      expect(rows.reduce((total, row) => total + row.total, 0)).toBe(65);
      expect(computeTotalPay(viewModel, 50)).toBe(65);

      const extras = breakdownToDetailGroups(viewModel, t, false).find(
        ({ key }) => key === "extras",
      );
      expect(extras?.items).toContainEqual({
        label: t("pay_labels.evening", { percent: 30 }),
        value: 2,
      });
      expect(extras?.items).toContainEqual({
        label: t("pay_labels.night", { percent: 30 }),
        value: 1,
      });
    },
  );

  it("includes custom addition columns and totals in the print/PDF table", async () => {
    const english = i18n.cloneInstance({ lng: "en" });
    await english.init();
    const { container } = render(
      <I18nextProvider i18n={english}>
        <WorkTablePrintView
          domain={domain}
          workDays={[]}
          monthName="August"
          shabbatCreditHoursByDate={{}}
          monthBreakdown={viewModel}
        />
      </I18nextProvider>,
    );

    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    const headers = within(table!).getAllByRole("columnheader", {
      hidden: true,
    });
    expect(headers.map((header) => header.textContent)).toContain(
      "Evening bonus (30%)",
    );
    expect(headers.map((header) => header.textContent)).toContain(
      "Night bonus (30%)",
    );
    expect(table!.querySelector('thead th[colspan="4"]')?.textContent).toBe(
      "Extras",
    );
    const cells = table!.querySelectorAll("tfoot td");
    expect(
      Array.from(cells)
        .slice(6, 10)
        .map((cell) => cell.textContent),
    ).toEqual(["2.00", "", "2.00", "1.00"]);
  });
});
