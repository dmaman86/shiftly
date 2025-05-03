import { useEffect, useState } from "react";
import { format } from "date-fns";
import { WorkDayRowProps } from "@/models";

const hebrewDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

const paidHolidays = [
  "Rosh Hashana",
  "Rosh Hashana II",
  "Yom Kippur",
  "Sukkot I",
  "Shmini Atzeret",
  "Pesach I",
  "Yom HaAtzma’ut",
  "Shavuot",
];

const fetchHolidayDates = async (
  year: number,
  month: number,
): Promise<Record<string, string[]>> => {
  const url = `https://www.hebcal.com/hebcal/?v=1&year=${year}&month=${month}&cfg=json&maj=on&mod=on&nx=on&s=on`;
  const response = await fetch(url);
  const data = await response.json();

  const eventMap: Record<string, string[]> = {};
  data.items.forEach((item: { date: string; title: string }) => {
    const date = item.date.split("T")[0];
    if (!eventMap[date]) eventMap[date] = [];
    eventMap[date].push(item.title);
  });
  return eventMap;
};

export const useWorkDays = (year: number, month: number) => {
  const [workDays, setWorkDays] = useState<WorkDayRowProps[]>([]);
  const [events, setEvents] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const formatDate = (date: Date): string => format(date, "yyyy-MM-dd");

  const getHebrewDayLetter = (date: Date): string => {
    return hebrewDays[date.getDay()];
  };

  const isPaidHoliday = (eventTitles: string[]): boolean =>
    eventTitles.some(
      (e) =>
        paidHolidays.includes(e) ||
        (e.startsWith("Rosh Hashana") && !paidHolidays.includes(e)),
    );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const fetchedEvents = await fetchHolidayDates(year, month);
        setEvents(fetchedEvents);
      } catch (err) {
        setError("Error fetching holiday dates");
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  useEffect(() => {
    if (Object.keys(events).length === 0) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const days: WorkDayRowProps[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const formattedDate = formatDate(currentDate);
      const weekday = currentDate.getDay();
      const hebrewDay = getHebrewDayLetter(currentDate);
      const eventTitles = events[formattedDate] || [];

      let specialDay = false;
      let fullDay = false;

      if (weekday === 6) {
        specialDay = true;
        fullDay = true;
      } else if (
        eventTitles.some((e) => e.startsWith("Erev")) ||
        eventTitles.includes("Yom HaZikaron") ||
        eventTitles.includes("Sukkot VII (Hoshana Raba)")
      ) {
        specialDay = true;
        fullDay = false;
      } else if (isPaidHoliday(eventTitles)) {
        specialDay = true;
        fullDay = true;
      } else if (weekday === 5) {
        specialDay = true;
        fullDay = false;
      }

      const row: WorkDayRowProps = {
        date: formattedDate,
        hebrewDay,
        specialDay,
        fullDay,
        specialNextDay: false,
      };

      if (day > 1) {
        const prevRow = days[day - 2];
        prevRow.specialNextDay = fullDay;
        days[day - 2] = prevRow;
      }
      days[day - 1] = row;
    }

    setWorkDays(days);
    setLoading(false);
  }, [events]);

  return { workDays, loading, error, events };
};
