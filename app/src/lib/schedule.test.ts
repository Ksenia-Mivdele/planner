import { describe, expect, it } from "vitest";
import { createDefaultAvailability, type PlannerEntry } from "../types/planner";
import {
  calculateFreeMinutes,
  findConflictingEntries,
  mergeIntervals,
  subtractIntervals,
  timeToMinutes,
} from "./schedule";

const createEntry = (overrides: Partial<PlannerEntry>): PlannerEntry => ({
  id: crypto.randomUUID(),
  type: "task",
  title: "Тестовая задача",
  category: "work",
  date: "2026-09-14",
  startTime: "10:00",
  durationMinutes: 60,
  description: "",
  status: "in-progress",
  createdAt: "2026-09-12T10:00:00.000Z",
  updatedAt: "2026-09-12T10:00:00.000Z",
  ...overrides,
});

describe("календарные расчёты", () => {
  it("преобразует время в минуты", () => {
    expect(timeToMinutes("09:15")).toBe(555);
  });

  it("объединяет пересекающиеся интервалы", () => {
    expect(
      mergeIntervals([
        { start: 60, end: 120 },
        { start: 100, end: 180 },
      ]),
    ).toEqual([{ start: 60, end: 180 }]);
  });

  it("вычитает занятой интервал из доступного времени", () => {
    expect(
      subtractIntervals([{ start: 540, end: 720 }], [{ start: 600, end: 660 }]),
    ).toEqual([
      { start: 540, end: 600 },
      { start: 660, end: 720 },
    ]);
  });

  it("не вычитает пересечение задач дважды из свободного времени", () => {
    const entries = [
      createEntry({ startTime: "10:00", durationMinutes: 120 }),
      createEntry({ startTime: "11:00", durationMinutes: 120 }),
    ];
    expect(
      calculateFreeMinutes({
        date: new Date("2026-09-14T12:00:00"),
        availability: createDefaultAvailability(),
        entries,
      }),
    ).toBe(540);
  });

  it("считает личное время в выходной, но исключает рабочее", () => {
    expect(
      calculateFreeMinutes({
        date: new Date("2026-09-13T12:00:00"),
        availability: createDefaultAvailability(),
        entries: [],
      }),
    ).toBe(180);
  });

  it("находит конфликтующие записи одного дня", () => {
    const first = createEntry({ startTime: "10:00", durationMinutes: 120 });
    const second = createEntry({ startTime: "11:30", durationMinutes: 60 });
    const third = createEntry({ startTime: "13:00", durationMinutes: 30 });
    expect(findConflictingEntries([first, second, third])).toEqual([
      [first, second],
    ]);
  });
});
