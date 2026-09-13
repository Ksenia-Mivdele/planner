import { afterEach, describe, expect, it } from "vitest";
import type { PlannerEntry } from "../types/planner";
import {
  deleteEntry,
  deletePlannerDatabase,
  getEntry,
  getSettings,
  importPlannerData,
  listEntriesForDate,
  saveEntry,
  saveSettings,
} from "./database";

const entry: PlannerEntry = {
  id: "entry-1",
  type: "task",
  title: "Проверить базу",
  category: "work",
  date: "2026-09-14",
  startTime: "10:00",
  durationMinutes: 30,
  description: "",
  status: "in-progress",
  createdAt: "2026-09-12T10:00:00.000Z",
  updatedAt: "2026-09-12T10:00:00.000Z",
};

afterEach(async () => {
  await deletePlannerDatabase();
});

describe("локальная база Планировщика", () => {
  it("возвращает настройки по умолчанию до первого сохранения", async () => {
    await expect(getSettings()).resolves.toMatchObject({
      defaultDurationMinutes: 30,
      hasCompletedInitialSetup: false,
    });
  });

  it("сохраняет и читает запись по дате", async () => {
    await saveEntry(entry);
    await expect(getEntry(entry.id)).resolves.toEqual(entry);
    await expect(listEntriesForDate(entry.date)).resolves.toEqual([entry]);
  });

  it("сохраняет изменения и удаляет запись", async () => {
    await saveEntry(entry);
    await saveEntry({ ...entry, title: "Обновлённая запись" });
    await expect(getEntry(entry.id)).resolves.toMatchObject({
      title: "Обновлённая запись",
    });
    await deleteEntry(entry.id);
    await expect(getEntry(entry.id)).resolves.toBeUndefined();
  });

  it("сохраняет изменения настроек", async () => {
    const settings = await getSettings();
    await saveSettings({
      ...settings,
      theme: "dark",
      hasCompletedInitialSetup: true,
    });
    await expect(getSettings()).resolves.toMatchObject({
      theme: "dark",
      hasCompletedInitialSetup: true,
    });
  });

  it("не удаляет данные при некорректном импорте", async () => {
    await saveEntry(entry);
    await expect(
      importPlannerData({
        schemaVersion: 1,
        settings: {},
        entries: [],
        habits: [],
      }),
    ).rejects.toThrow("резервной копией");
    await expect(getEntry(entry.id)).resolves.toEqual(entry);
  });

  it("импортирует проверенную резервную копию", async () => {
    const settings = await getSettings();
    const backup = {
      schemaVersion: 1 as const,
      settings: { ...settings, theme: "dark" as const },
      entries: [entry],
      habits: [],
    };
    await expect(importPlannerData(backup)).resolves.toEqual(backup);
    await expect(getSettings()).resolves.toMatchObject({ theme: "dark" });
    await expect(getEntry(entry.id)).resolves.toEqual(entry);
  });
});
