export interface WorkShift {
  startTime: string;
  endTime: string;
}

export interface TimeFieldType {
  date: Date;
  minutes: number;
}

export interface Segment {
  start: number | null;
  end: number | null;
}

export type WorkDayStatus = "normal" | "sick" | "vacation";

export enum WorkDayType {
  Regular = "Regular", // special: false, fullDayPay: false
  SpecialPartialStart = "SpecialPartialStart", // special: true, fullDayPay: false
  SpecialFull = "SpecialFull", // special: true, fullDayPay: true
}

export interface WorkDayInput {
  date: string;
  shifts: WorkShift[];
  baseRate: number;
  isHoliday?: boolean;
  isShabbat?: boolean;
  isFriday?: boolean;
  isSickDay?: boolean;
  isVacationDay?: boolean;
}

// export interface HourBreakdown {
//   regular: number;
//   afternoon: number;
//   night: number;
//   saturdayDay: number;
//   saturdayNight: number;
//   vacationOrSick: number;
//   extra: number;
// }

export interface PaySegment {
  percent: number;
  hours: number;
}

export interface SpecialBreakdown {
  shabbat150: PaySegment;
  shabbat200: PaySegment;
  extra100Shabbat: PaySegment;
}

export interface RegularBreakdown {
  hours100: PaySegment;
  hours125: PaySegment;
  hours150: PaySegment;
  hours20: PaySegment;
  hours50: PaySegment;
}

export interface WorkDayPayMap {
  regular: RegularBreakdown;
  special: SpecialBreakdown;
  hours100Sick: PaySegment;
  hours100Vacation: PaySegment;
  totalHours: number;
  totalPay: number;
}

export interface RegularPercent {
  hours100: number;
  hours125: number;
  hours150: number;
}

export interface HourBreakdown {
  totalHours: number;
  hours100: number;
  hours125: number;
  hours150: number;
  shabbat150: number;
  shabbat200: number;
  extra100Shabbat: number;
  hours20: number;
  hours50: number;
  hours100Sick: number;
  hours100Vacation: number;
}

export interface WorkDayRowProps {
  date: string;
  hebrewDay: string;
  typeDay: WorkDayType;
  crossDayContinuation: boolean;
}

export interface WorkDayResult {
  totalHours: number;
  hours100: number;
  hours125: number;
  hours150: number;
  shabbat150: number;
  shabbat200: number;
  extra100Shabbat: number;
  totalPay: number;
}

export interface ApiResponse {
  data: Record<string, string[]> | null;
  error: string | null;
}
