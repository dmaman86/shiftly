import { WorkDayPayMap } from "@/models";

export const sumBreakdowns = (
  a: WorkDayPayMap,
  b: WorkDayPayMap,
): WorkDayPayMap => ({
  regular: {
    hours100: {
      ...a.regular.hours100,
      hours: a.regular.hours100.hours + b.regular.hours100.hours,
    },
    hours125: {
      ...a.regular.hours125,
      hours: a.regular.hours125.hours + b.regular.hours125.hours,
    },
    hours150: {
      ...a.regular.hours150,
      hours: a.regular.hours150.hours + b.regular.hours150.hours,
    },
    hours20: {
      ...a.regular.hours20,
      hours: a.regular.hours20.hours + b.regular.hours20.hours,
    },
    hours50: {
      ...a.regular.hours50,
      hours: a.regular.hours50.hours + b.regular.hours50.hours,
    },
  },
  special: {
    shabbat150: {
      ...a.special.shabbat150,
      hours: a.special.shabbat150.hours + b.special.shabbat150.hours,
    },
    shabbat200: {
      ...a.special.shabbat200,
      hours: a.special.shabbat200.hours + b.special.shabbat200.hours,
    },
    extra100Shabbat: {
      ...a.special.extra100Shabbat,
      hours: a.special.extra100Shabbat.hours + b.special.extra100Shabbat.hours,
    },
  },
  hours100Sick: {
    ...a.hours100Sick,
    hours: a.hours100Sick.hours + b.hours100Sick.hours,
  },
  hours100Vacation: {
    ...a.hours100Vacation,
    hours: a.hours100Vacation.hours + b.hours100Vacation.hours,
  },
  totalHours: a.totalHours + b.totalHours,
});

export const subtractBreakdowns = (
  a: WorkDayPayMap,
  b: WorkDayPayMap,
): WorkDayPayMap => ({
  regular: {
    hours100: {
      ...a.regular.hours100,
      hours: a.regular.hours100.hours - b.regular.hours100.hours,
    },
    hours125: {
      ...a.regular.hours125,
      hours: a.regular.hours125.hours - b.regular.hours125.hours,
    },
    hours150: {
      ...a.regular.hours150,
      hours: a.regular.hours150.hours - b.regular.hours150.hours,
    },
    hours20: {
      ...a.regular.hours20,
      hours: a.regular.hours20.hours - b.regular.hours20.hours,
    },
    hours50: {
      ...a.regular.hours50,
      hours: a.regular.hours50.hours - b.regular.hours50.hours,
    },
  },
  special: {
    shabbat150: {
      ...a.special.shabbat150,
      hours: a.special.shabbat150.hours - b.special.shabbat150.hours,
    },
    shabbat200: {
      ...a.special.shabbat200,
      hours: a.special.shabbat200.hours - b.special.shabbat200.hours,
    },
    extra100Shabbat: {
      ...a.special.extra100Shabbat,
      hours: a.special.extra100Shabbat.hours - b.special.extra100Shabbat.hours,
    },
  },
  hours100Sick: {
    ...a.hours100Sick,
    hours: a.hours100Sick.hours - b.hours100Sick.hours,
  },
  hours100Vacation: {
    ...a.hours100Vacation,
    hours: a.hours100Vacation.hours - b.hours100Vacation.hours,
  },
  totalHours: a.totalHours - b.totalHours,
});

export const emptyBreakdown = (): WorkDayPayMap => ({
  regular: {
    hours100: { percent: 1, hours: 0 },
    hours125: { percent: 1.25, hours: 0 },
    hours150: { percent: 1.5, hours: 0 },
    hours20: { percent: 0.2, hours: 0 },
    hours50: { percent: 0.5, hours: 0 },
  },
  special: {
    shabbat150: { percent: 1.5, hours: 0 },
    shabbat200: { percent: 2, hours: 0 },
    extra100Shabbat: { percent: 1, hours: 0 },
  },
  hours100Sick: { percent: 1, hours: 0 },
  hours100Vacation: { percent: 1, hours: 0 },
  totalHours: 0,
});
