export const ENTRY_TYPES = ["task", "meeting", "event"] as const;
export const ENTRY_STATUSES = ["in-progress", "done"] as const;
export const ENTRY_CATEGORIES = ["personal", "work"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type EntryStatus = (typeof ENTRY_STATUSES)[number];
export type EntryCategory = (typeof ENTRY_CATEGORIES)[number];
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TimeInterval = { start: string; end: string };

export type DayAvailability = {
  weekday: Weekday;
  isDayOff: boolean;
  work: TimeInterval | null;
  personal: TimeInterval | null;
  unavailable: TimeInterval[];
};

export type AppSettings = {
  theme: "light" | "dark";
  defaultDurationMinutes: number;
  availability: DayAvailability[];
  hasCompletedInitialSetup: boolean;
};

export type Subtask = { id: string; title: string; isDone: boolean };

export type PlannerEntry = {
  id: string;
  type: EntryType;
  title: string;
  category: EntryCategory;
  date: string;
  startTime: string;
  durationMinutes: number;
  description: string;
  status: EntryStatus;
  subtasks: Subtask[];
  originHabitId?: string;
  createdAt: string;
  updatedAt: string;
};

export type HabitTemplate = {
  id: string;
  title: string;
  category: EntryCategory;
  startTime: string;
  durationMinutes: number;
  weekdays: Weekday[];
  startsOn: string;
  endsOn?: string;
  description: string;
  subtasks: Omit<Subtask, "id" | "isDone">[];
  createdAt: string;
  updatedAt: string;
};

export type UndoAction = {
  id: string;
  type: "create" | "update" | "delete" | "move" | "resize";
  createdAt: string;
  payload: unknown;
};

export const createDefaultAvailability = (): DayAvailability[] =>
  ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((weekday) => ({
    weekday,
    isDayOff: weekday === 6 || weekday === 7,
    work: weekday <= 5 ? { start: "09:00", end: "18:00" } : null,
    personal: { start: "19:00", end: "22:00" },
    unavailable: [],
  }));

export const createDefaultSettings = (): AppSettings => ({
  theme: "light",
  defaultDurationMinutes: 30,
  availability: createDefaultAvailability(),
  hasCompletedInitialSetup: false,
});
