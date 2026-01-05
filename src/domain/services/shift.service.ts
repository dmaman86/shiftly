import { Shift, TimeFieldType } from "../types/data-shapes";
import { DateService } from "./date.service";

export class ShiftService {
  private readonly config = {
    minutesInHour: 60,
    minutesInDay: 1440,
  };

  constructor(private readonly dateService: DateService) {}

  getMinutesFromMidnight(date: Date, referenceDate?: Date): number {
    const shiftMinutes = this.dateService.getMinutesFromMidnight(date);

    if (referenceDate) {
      const daysDiff = this.dateService.getDaysDifference(date, referenceDate);
      return shiftMinutes + daysDiff * this.config.minutesInDay;
    }

    return shiftMinutes;
  }

  getDurationShift(shift: Shift): number {
    const startMinutes = this.getMinutesFromMidnight(shift.start.date);
    const endMinutes = this.getMinutesFromMidnight(
      shift.end.date,
      shift.start.date,
    );
    return (endMinutes - startMinutes) / this.config.minutesInHour;
  }

  isValidShiftDuration(shift: Shift): boolean {
    return this.dateService.isAfterDate(shift.end.date, shift.start.date);
  }

  toggleNextDay(shift: Shift, toNextDay: boolean): TimeFieldType {
    const daysOffset = toNextDay ? 1 : -1;
    const newEndDate = this.dateService.addDaysToDate(
      shift.end.date,
      daysOffset,
    );
    return { date: newEndDate };
  }

  isCrossDay(shift: Shift): boolean {
    const daysDiff = this.dateService.getDaysDifference(
      shift.end.date,
      shift.start.date,
    );
    return daysDiff > 0;
  }
}
