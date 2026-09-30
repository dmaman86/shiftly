type CalendarDayIndicatorInput = {
  hasWorkDay: boolean;
  hasEdits: boolean;
  hasShabbatCredit: boolean;
};

export const getCalendarDayIndicators = ({
  hasWorkDay,
  hasEdits,
  hasShabbatCredit,
}: CalendarDayIndicatorInput) => ({
  showWorkIndicator: hasWorkDay && hasEdits,
  showCreditIndicator: hasWorkDay && hasShabbatCredit,
});
