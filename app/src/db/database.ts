import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AppSettings,
  HabitTemplate,
  PlannerEntry,
  UndoAction,
} from "../types/planner";
import { createDefaultSettings } from "../types/planner";

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
export const exportPlannerData = async (): Promise<PlannerExport> => ({
  schemaVersion: 1,
  settings: await getSettings(),
  entries: await listEntries(),
  habits: await listHabits(),
});
export const importPlannerData = async (data: unknown): Promise<void> => {
  const candidate = data as Partial<PlannerExport>;
  if (
    candidate.schemaVersion !== 1 ||
    !candidate.settings ||
    !Array.isArray(candidate.entries) ||
    !Array.isArray(candidate.habits)
  )
    throw new Error("Файл не является резервной копией Планировщика.");
  await clearAllData();
  await saveSettings(candidate.settings);
  await Promise.all(candidate.entries.map(saveEntry));
  await Promise.all(candidate.habits.map(saveHabit));
};
