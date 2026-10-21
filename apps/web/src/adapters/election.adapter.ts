import type { CalendarEvent, CalendarEventMap } from "@shiftly/domain";
import { CalendarEventKind } from "@shiftly/domain";
import type { PublishedElection } from "@/services/reference/reference.service";

const isElectionDay = (event: CalendarEvent) =>
  event.kind === CalendarEventKind.KnessetElectionDay;

/**
 * Replaces the year's election days in a legacy event map with the published
 * ones. Every other event is kept as is. Returns a new map.
 */
export const replaceElectionDays = (
  eventMap: CalendarEventMap,
  year: number,
  elections: readonly PublishedElection[],
): CalendarEventMap => {
  const yearPrefix = `${year}-`;
  const result: CalendarEventMap = {};

  for (const [date, events] of Object.entries(eventMap)) {
    const kept = date.startsWith(yearPrefix)
      ? events.filter((event) => !isElectionDay(event))
      : events;
    if (kept.length > 0) result[date] = kept;
  }

  for (const { date, knessetNumber } of elections) {
    if (!date.startsWith(yearPrefix)) continue;
    result[date] = [
      ...(result[date] ?? []),
      { kind: CalendarEventKind.KnessetElectionDay, knessetNumber },
    ];
  }

  return result;
};
