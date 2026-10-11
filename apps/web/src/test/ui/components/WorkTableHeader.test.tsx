import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Table } from "@mui/material";
import i18n from "@/i18n";
import { headersTable } from "@/app/constants/ui.constant";
import { WorkTableHeader } from "@/features/work-table/components/month/WorkTableHeader";

afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage("he");
  });
});

describe("WorkTableHeader translation keys", () => {
  it.each(["en", "he"])(
    "translates the same header identities in %s",
    async (language) => {
      await act(async () => {
        await i18n.changeLanguage(language);
      });
      render(
        <Table>
          <WorkTableHeader
            headers={headersTable}
            baseRate={0}
            viewMode="compact"
          />
        </Table>,
      );
      expect(
        screen.getByText(i18n.t("headers.day", { ns: "work-table" })),
      ).toBeInTheDocument();
      expect(
        screen.getByText(i18n.t("headers.entry", { ns: "work-table" })),
      ).toBeInTheDocument();
      expect(headersTable[0].label).toBe("day");
    },
  );
  it("preserves blank cells and numeric rate labels", () => {
    render(
      <Table>
        <WorkTableHeader
          headers={[
            { label: "", children: ["100%", "125%"], viewMode: "both" },
          ]}
          baseRate={0}
          viewMode="compact"
        />
      </Table>,
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("125%")).toBeInTheDocument();
  });
});
