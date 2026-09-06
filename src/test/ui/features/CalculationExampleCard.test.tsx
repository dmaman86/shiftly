import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/ui/utils";
import { pipelineInstance } from "@/test/ui/utils/setup-domain";
import { CalculationExampleCard } from "@/features/calculation-rules";
import { analyticsService } from "@/services";

const domain = {
  payMap: {
    shiftMapBuilder: pipelineInstance.payMap.shiftMapBuilder,
    dayPayMapBuilder: pipelineInstance.payMap.dayPayMapBuilder,
    monthPayMapCalculator: pipelineInstance.payMap.monthPayMapCalculator,
    workDaysMonthBuilder: pipelineInstance.payMap.workDaysForMonthBuilder,
  },
  resolvers: {
    holidayResolver: pipelineInstance.resolvers.holidayResolver,
    perDiemResolver: pipelineInstance.resolvers.perDiemRateResolver,
    dayInfoResolver: pipelineInstance.resolvers.workDayInfoResolver,
    monthResolver: pipelineInstance.resolvers.monthResolver,
    mealAllowanceRateResolver: pipelineInstance.resolvers.mealAllowanceRateResolver,
  },
  services: {
    dateService: pipelineInstance.services.dateService,
    shiftService: pipelineInstance.services.shiftService,
  },
};

describe("CalculationExampleCard", () => {
  const trackSpy = vi.spyOn(analyticsService, "track");

  beforeEach(() => {
    trackSpy.mockClear();
  });

  const expandExample = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(
      screen.getByRole("button", {
        name: "🧮 דוגמת חישוב אינטראקטיבית",
      }),
    );
  };

  it("opens automatically when requested by the rules page", () => {
    renderWithProviders(
      <CalculationExampleCard defaultExpanded domain={domain} />,
    );

    expect(
      screen.getByRole("button", {
        name: "🧮 דוגמת חישוב אינטראקטיבית",
      }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(trackSpy).toHaveBeenCalledWith({
      name: "calculation_rules_accordion_expanded",
      params: {
        section: "interactive_example",
        open_method: "deep_link",
      },
    });
  });

  it("calculates an example without writing it to the work table state", async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(
      <CalculationExampleCard domain={domain} />,
    );

    const summary = screen.getByRole("button", {
      name: "🧮 דוגמת חישוב אינטראקטיבית",
    });
    expect(summary).toHaveAttribute("aria-expanded", "false");

    await expandExample(user);

    expect(summary).toHaveAttribute("aria-expanded", "true");
    expect(trackSpy).toHaveBeenCalledWith({
      name: "calculation_rules_accordion_expanded",
      params: {
        section: "interactive_example",
        open_method: "manual",
      },
    });
    expect(screen.getByText("משמרת 1")).toBeInTheDocument();
    expect(screen.getByText(/סיכום יומי · 8\.00 שעות בפועל/)).toBeInTheDocument();
    expect(store.getState().global.dailyPayMaps).toEqual({});
  });

  it("shows the seasonal start time for a Shabbat or holiday eve", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalculationExampleCard domain={domain} />);
    await expandExample(user);

    await user.click(screen.getByRole("combobox", { name: "סוג יום" }));
    await user.click(screen.getByRole("option", { name: "ערב שבת/חג" }));

    expect(
      screen.getByText(
        /לפי שעון ישראל הנוכחי, שעת תחילת שבת\/חג המשמשת בחישוב היא (17:00|18:00)/,
      ),
    ).toBeInTheDocument();
  });

  it("shows earned Shabbat credit without claiming a monthly allocation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalculationExampleCard domain={domain} />);
    await expandExample(user);

    await user.click(screen.getByRole("combobox", { name: "סוג יום" }));
    await user.click(screen.getByRole("option", { name: "שבת/חג" }));

    expect(screen.getByText(/נצברו 8\.00 שעות זכות שבת/)).toBeInTheDocument();
    expect(screen.getByText(/יתרה שלא תנוצל תיצבר ותועבר לחודש הבא/)).toBeInTheDocument();
  });

  it("updates work parameters and displays the estimated daily pay", async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(
      <CalculationExampleCard domain={domain} />,
    );
    await expandExample(user);

    const standardHoursInput = screen.getByLabelText("שעות תקן");
    const baseRateInput = screen.getByLabelText("שכר שעתי");

    await user.clear(standardHoursInput);
    await user.type(standardHoursInput, "8");
    await user.clear(baseRateInput);
    await user.type(baseRateInput, "50");

    await waitFor(() => {
      expect(store.getState().global.config.standardHours).toBe(8);
      expect(store.getState().global.config.baseRate).toBe(50);
      expect(
        screen.getByText("שכר יומי משוער").parentElement,
      ).toHaveTextContent("₪400.00");
    });
  });
});
