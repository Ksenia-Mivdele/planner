import { addDays, format, getISODay, startOfWeek } from "date-fns";
import type {
  DayAvailability,
  PlannerEntry,
  TimeInterval,
  Weekday,
} from "../types/planner";

export type MinuteInterval = { start: number; end: number };

export const MINUTES_IN_DAY = 24 * 60;

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Некорректное время: ${time}`);
  }

  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const normalized = Math.max(0, Math.min(MINUTES_IN_DAY, minutes));
  const hours = Math.floor(normalized / 60);
  return `${String(hours).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
};

export const toMinuteInterval = ({
  start,
  end,
}: TimeInterval): MinuteInterval => {
  const interval = { start: timeToMinutes(start), end: timeToMinutes(end) };
  if (interval.end <= interval.start)
    throw new Error("Конец интервала должен быть позже начала");
  return interval;
};

export const mergeIntervals = (
  intervals: MinuteInterval[],
): MinuteInterval[] => {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .map((interval) => ({ ...interval }))
    .sort((first, second) => first.start - second.start);

  return sorted.reduce<MinuteInterval[]>((merged, interval) => {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) {
      merged.push(interval);
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
    return merged;
  }, []);
};

export const subtractIntervals = (
  available: MinuteInterval[],
  occupied: MinuteInterval[],
): MinuteInterval[] => {
  const normalizedOccupied = mergeIntervals(occupied);

  return mergeIntervals(available).flatMap((availableInterval) => {
    let cursor = availableInterval.start;
    const result: MinuteInterval[] = [];

    normalizedOccupied.forEach((occupiedInterval) => {
      if (
        occupiedInterval.end <= cursor ||
        occupiedInterval.start >= availableInterval.end
      )
        return;
      if (occupiedInterval.start > cursor)
        result.push({
          start: cursor,
          end: Math.min(occupiedInterval.start, availableInterval.end),
        });
      cursor = Math.max(cursor, occupiedInterval.end);
    });

    if (cursor < availableInterval.end)
      result.push({ start: cursor, end: availableInterval.end });
    return result;
  });
};

export const intervalDuration = (intervals: MinuteInterval[]): number =>
  intervals.reduce(
    (total, interval) => total + interval.end - interval.start,
    0,
  );

export const getWeekStart = (date: Date): Date =>
  startOfWeek(date, { weekStartsOn: 1 });

export const getWeekDates = (date: Date): string[] => {
  const weekStart = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(weekStart, index), "yyyy-MM-dd"),
  );
};

export const getDayAvailability = (
  date: Date,
  availability: DayAvailability[],
): DayAvailability | undefined =>
  availability.find((day) => day.weekday === (getISODay(date) as Weekday));

export const entryToInterval = (entry: PlannerEntry): MinuteInterval => ({
  start: timeToMinutes(entry.startTime),
  end: Math.min(
    MINUTES_IN_DAY,
    timeToMinutes(entry.startTime) + entry.durationMinutes,
  ),
});

export const findConflictingEntries = (
  entries: PlannerEntry[],
): Array<[PlannerEntry, PlannerEntry]> => {
  const conflicts: Array<[PlannerEntry, PlannerEntry]> = [];
  const entriesByDate = new Map<string, PlannerEntry[]>();

  entries.forEach((entry) => {
    entriesByDate.set(entry.date, [
      ...(entriesByDate.get(entry.date) ?? []),
      entry,
    ]);
  });

  entriesByDate.forEach((entriesOnDate) => {
    const sorted = [...entriesOnDate].sort(
      (first, second) =>
        timeToMinutes(first.startTime) - timeToMinutes(second.startTime),
    );
    for (let firstIndex = 0; firstIndex < sorted.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < sorted.length;
        secondIndex += 1
      ) {
        const first = entryToInterval(sorted[firstIndex]);
        const second = entryToInterval(sorted[secondIndex]);
        if (second.start >= first.end) break;
        conflicts.push([sorted[firstIndex], sorted[secondIndex]]);
      }
    }
  });

  return conflicts;
};

export const calculateFreeMinutes = ({
  date,
  availability,
  entries,
}: {
  date: Date;
  availability: DayAvailability[];
  entries: PlannerEntry[];
}): number => {
  const dayAvailability = getDayAvailability(date, availability);
  if (!dayAvailability) return 0;

  const available = [
    dayAvailability.isDayOff ? null : dayAvailability.work,
    dayAvailability.personal,
  ]
    .filter((interval): interval is TimeInterval => interval !== null)
    .map(toMinuteInterval);
  const unavailable = dayAvailability.unavailable.map(toMinuteInterval);
  const dateKey = format(date, "yyyy-MM-dd");
  const booked = entries
    .filter((entry) => entry.date === dateKey)
    .map(entryToInterval);

  return intervalDuration(
    subtractIntervals(available, [...unavailable, ...booked]),
  );
};
