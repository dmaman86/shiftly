import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enUS, he } from "date-fns/locale";
import { enUS as pickerEnUS, heIL } from "@mui/x-date-pickers/locales";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { ProfileRangeSelector } from "@/features/profile/components/ProfileRangeSelector";

const range = { from: { year: 2026, month: 5 }, to: { year: 2026, month: 10 } };
const onChange = vi.fn();

const LocalizedSelector = () => {
  const { i18n: translation } = useTranslation();
  const isHebrew = translation.resolvedLanguage === "he";
  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={isHebrew ? he : enUS}
      localeText={
        (isHebrew ? heIL : pickerEnUS).components.MuiLocalizationProvider
          .defaultProps.localeText
      }
    >
      <ProfileRangeSelector range={range} now={range.to} onChange={onChange} />
    </LocalizationProvider>
  );
};

describe("ProfileRangeSelector localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    onChange.mockReset();
  });
  afterEach(async () => {
    cleanup();
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  it.each([
    ["en", "May", "January"],
    ["he", "מאי", "ינואר"],
  ])(
    "shows custom field and calendar months in %s",
    async (language, selectedMonth, calendarMonth) => {
      const user = userEvent.setup();
      await i18n.changeLanguage(language);
      render(<LocalizedSelector />);
      await user.selectOptions(screen.getByRole("combobox"), "custom");
      expect(screen.getAllByRole("spinbutton")[0]).toHaveTextContent(
        selectedMonth,
      );
      await user.click(screen.getAllByRole("button")[0]);
      expect(
        screen.getByRole("radio", { name: calendarMonth }),
      ).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("updates the locale without discarding custom drafts or applying them early", async () => {
    const user = userEvent.setup();
    render(<LocalizedSelector />);
    await user.selectOptions(screen.getByRole("combobox"), "custom");
    await user.click(screen.getAllByRole("button")[0]);
    await user.click(screen.getByRole("radio", { name: "January" }));
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => {
      await i18n.changeLanguage("he");
    });
    expect(screen.getAllByRole("spinbutton")[0]).toHaveTextContent("ינואר");
    await user.click(screen.getAllByRole("button")[0]);
    expect(
      within(screen.getByRole("dialog")).getByRole("radio", { name: "מאי" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("button", {
        name: i18n.t("pages:profile_page.range_apply"),
      }),
    );
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      from: { year: 2026, month: 1 },
      to: range.to,
    });
  });

  it("disables future months and rejects reversed calendar selections", async () => {
    const user = userEvent.setup();
    render(<LocalizedSelector />);
    await user.selectOptions(screen.getByRole("combobox"), "custom");
    await user.click(screen.getAllByRole("button")[1]);
    expect(screen.getByRole("radio", { name: "November" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "December" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "January" }));
    expect(screen.getByRole("alert")).toHaveTextContent("must not be after");
    expect(screen.getByRole("button", { name: "Apply range" })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
