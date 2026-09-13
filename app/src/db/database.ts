import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AppSettings,
  HabitTemplate,
  PlannerEntry,
  UndoAction,
} from "../types/planner";
import { createDefaultSettings } from "../types/planner";
import { createHabitOccurrences } from "../lib/habits";

const DATABASE_NAME = "planner";
const DATABASE_VERSION = 1;
const SETTINGS_KEY = "primary";

interface PlannerDatabase extends DBSchema {
  settings: { key: string; value: { id: string; value: AppSettings } };
  entries: {
    key: string;
    value: PlannerEntry;
    indexes: { "by-date": string; "by-updated-at": string };
  };
  habits: {
    key: string;
    value: HabitTemplate;
    indexes: { "by-starts-on": string };
  };
  undo: {
    key: string;
    value: UndoAction;
    indexes: { "by-created-at": string };
  };
}

let databasePromise: Promise<IDBPDatabase<PlannerDatabase>> | undefined;

const getDatabase = () => {
  databasePromise ??= openDB<PlannerDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      database.createObjectStore("settings", { keyPath: "id" });
      const entries = database.createObjectStore("entries", { keyPath: "id" });
      entries.createIndex("by-date", "date");
      entries.createIndex("by-updated-at", "updatedAt");
      const habits = database.createObjectStore("habits", { keyPath: "id" });
      habits.createIndex("by-starts-on", "startsOn");
      const undo = database.createObjectStore("undo", { keyPath: "id" });
      undo.createIndex("by-created-at", "createdAt");
    },
  });

  return databasePromise;
};

export const getSettings = async (): Promise<AppSettings> => {
  const database = await getDatabase();
  const record = await database.get("settings", SETTINGS_KEY);
  return record?.value ?? createDefaultSettings();
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const database = await getDatabase();
  await database.put("settings", { id: SETTINGS_KEY, value: settings });
};

export const listEntries = async (): Promise<PlannerEntry[]> => {
  const database = await getDatabase();
  return database.getAllFromIndex("entries", "by-updated-at");
};

export const listEntriesForDate = async (
  date: string,
): Promise<PlannerEntry[]> => {
  const database = await getDatabase();
  return database.getAllFromIndex("entries", "by-date", date);
};

export const getEntry = async (
  id: string,
): Promise<PlannerEntry | undefined> => {
  const database = await getDatabase();
  return database.get("entries", id);
};

export const saveEntry = async (entry: PlannerEntry): Promise<void> => {
  const database = await getDatabase();
  await database.put("entries", entry);
};

export const deleteEntry = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.delete("entries", id);
};

export const listHabits = async (): Promise<HabitTemplate[]> => {
  const database = await getDatabase();
  return database.getAll("habits");
};

export const saveHabit = async (habit: HabitTemplate): Promise<void> => {
  const database = await getDatabase();
  await database.put("habits", habit);
};

export const deleteHabit = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.delete("habits", id);
};

/** Creates only missing independent copies, never overwriting a changed occurrence. */
export const ensureHabitOccurrences = async (
  from = new Date(),
): Promise<number> => {
  const [habits, entries] = await Promise.all([listHabits(), listEntries()]);
  const knownIds = new Set(entries.map((entry) => entry.id));
  const missing = habits.flatMap((habit) =>
    createHabitOccurrences(habit, from).filter(
      (entry) => !knownIds.has(entry.id),
    ),
  );
  await Promise.all(missing.map(saveEntry));
  return missing.length;
};

export const listUndoActions = async (): Promise<UndoAction[]> => {
  const database = await getDatabase();
  return database.getAllFromIndex("undo", "by-created-at");
};

export const saveUndoAction = async (action: UndoAction): Promise<void> => {
  const database = await getDatabase();
  await database.put("undo", action);
};

export const clearAllData = async (): Promise<void> => {
  const database = await getDatabase();
  const transaction = database.transaction(
    ["settings", "entries", "habits", "undo"],
    "readwrite",
  );
  await Promise.all([
    transaction.objectStore("settings").clear(),
    transaction.objectStore("entries").clear(),
    transaction.objectStore("habits").clear(),
    transaction.objectStore("undo").clear(),
    transaction.done,
  ]);
};

export const deletePlannerDatabase = async (): Promise<void> => {
  const database = await databasePromise;
  database?.close();
  databasePromise = undefined;
  await deleteDB(DATABASE_NAME);
};

export type PlannerExport = {
  schemaVersion: 1;
  settings: AppSettings;
  entries: PlannerEntry[];
  habits: HabitTemplate[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const isTime = (value: unknown): value is string =>
  isString(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const isInterval = (value: unknown): value is { start: string; end: string } =>
  isRecord(value) &&
  isTime(value.start) &&
  isTime(value.end) &&
  value.end > value.start;
const isEntry = (value: unknown): value is PlannerEntry =>
  isRecord(value) &&
  isString(value.id) &&
  ["task", "meeting", "event"].includes(String(value.type)) &&
  isString(value.title) &&
  ["personal", "work"].includes(String(value.category)) &&
  /^\d{4}-\d{2}-\d{2}$/.test(String(value.date)) &&
  isTime(value.startTime) &&
  Number.isInteger(value.durationMinutes) &&
  Number(value.durationMinutes) > 0 &&
  Number(value.durationMinutes) <= 24 * 60 &&
  isString(value.description) &&
  ["in-progress", "done"].includes(String(value.status)) &&
  isString(value.createdAt) &&
  isString(value.updatedAt);
const isDayAvailability = (value: unknown): boolean =>
  isRecord(value) &&
  Number.isInteger(value.weekday) &&
  Number(value.weekday) >= 1 &&
  Number(value.weekday) <= 7 &&
  typeof value.isDayOff === "boolean" &&
  (value.work === null || isInterval(value.work)) &&
  (value.personal === null || isInterval(value.personal)) &&
  Array.isArray(value.unavailable) &&
  value.unavailable.every(isInterval);
const isSettings = (value: unknown): value is AppSettings =>
  isRecord(value) &&
  (value.theme === "light" || value.theme === "dark") &&
  Number.isInteger(value.defaultDurationMinutes) &&
  Number(value.defaultDurationMinutes) > 0 &&
  Array.isArray(value.availability) &&
  value.availability.length === 7 &&
  value.availability.every(isDayAvailability) &&
  typeof value.hasCompletedInitialSetup === "boolean";
const isHabit = (value: unknown): value is HabitTemplate =>
  isRecord(value) &&
  isString(value.id) &&
  (value.type === undefined ||
    ["task", "meeting", "event"].includes(String(value.type))) &&
  isString(value.title) &&
  ["personal", "work"].includes(String(value.category)) &&
  isTime(value.startTime) &&
  Number.isInteger(value.durationMinutes) &&
  Number(value.durationMinutes) > 0 &&
  Array.isArray(value.weekdays) &&
  value.weekdays.every(
    (weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7,
  ) &&
  /^\d{4}-\d{2}-\d{2}$/.test(String(value.startsOn)) &&
  (value.endsOn === undefined ||
    /^\d{4}-\d{2}-\d{2}$/.test(String(value.endsOn))) &&
  isString(value.description) &&
  isString(value.createdAt) &&
  isString(value.updatedAt);

const parsePlannerExport = (data: unknown): PlannerExport => {
  if (!isRecord(data) || data.schemaVersion !== 1 || !isSettings(data.settings))
    throw new Error("Файл не является резервной копией Планировщика.");
  if (!Array.isArray(data.entries) || !data.entries.every(isEntry))
    throw new Error("В резервной копии есть некорректные записи.");
  if (!Array.isArray(data.habits) || !data.habits.every(isHabit))
    throw new Error("В резервной копии есть некорректные повторения.");
  return {
    schemaVersion: 1,
    settings: data.settings,
    entries: data.entries,
    habits: data.habits,
  };
};
export const exportPlannerData = async (): Promise<PlannerExport> => ({
  schemaVersion: 1,
  settings: await getSettings(),
  entries: await listEntries(),
  habits: await listHabits(),
});
export const importPlannerData = async (
  data: unknown,
): Promise<PlannerExport> => {
  const candidate = parsePlannerExport(data);
  const database = await getDatabase();
  const transaction = database.transaction(
    ["settings", "entries", "habits", "undo"],
    "readwrite",
  );
  const settingsStore = transaction.objectStore("settings");
  const entriesStore = transaction.objectStore("entries");
  const habitsStore = transaction.objectStore("habits");
  const undoStore = transaction.objectStore("undo");
  await Promise.all([
    settingsStore.clear(),
    entriesStore.clear(),
    habitsStore.clear(),
    undoStore.clear(),
  ]);
  await Promise.all([
    settingsStore.put({ id: SETTINGS_KEY, value: candidate.settings }),
    ...candidate.entries.map((entry) => entriesStore.put(entry)),
    ...candidate.habits.map((habit) => habitsStore.put(habit)),
  ]);
  await transaction.done;
  return candidate;
};
