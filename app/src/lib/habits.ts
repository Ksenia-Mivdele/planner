import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";
import type { HabitTemplate, PlannerEntry } from "../types/planner";

export const createHabitOccurrences = (
  habit: HabitTemplate,
  from: Date,
  weeks = 4,
): PlannerEntry[] => {
  const start = parseISO(habit.startsOn);
  const end = habit.endsOn ? parseISO(habit.endsOn) : addDays(from, weeks * 7);
  const horizon = addDays(from, weeks * 7);
  const createdAt = new Date().toISOString();
  const occurrences: PlannerEntry[] = [];
  for (
    let date = isAfter(start, from) ? start : from;
    !isAfter(date, horizon) && !isAfter(date, end);
    date = addDays(date, 1)
  ) {
    const weekday = ((date.getDay() + 6) % 7) + 1;
    if (habit.weekdays.includes(weekday as never) && !isBefore(date, start))
      occurrences.push({
        id: `${habit.id}:${format(date, "yyyy-MM-dd")}`,
        type: "task",
        title: habit.title,
        category: habit.category,
        date: format(date, "yyyy-MM-dd"),
        startTime: habit.startTime,
        durationMinutes: habit.durationMinutes,
        description: habit.description,
        status: "in-progress",
        subtasks: habit.subtasks.map((subtask) => ({
          id: crypto.randomUUID(),
          title: subtask.title,
          isDone: false,
        })),
        originHabitId: habit.id,
        createdAt,
        updatedAt: createdAt,
      });
  }
  return occurrences;
};
