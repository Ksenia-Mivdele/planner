import { describe, expect, it } from "vitest";
import { createHabitOccurrences } from "./habits";
describe("генерация привычек", () => {
  it("не создаёт экземпляры дальше четырёх недель", () => {
    const entries = createHabitOccurrences(
      {
        id: "h",
        title: "Спорт",
        category: "personal",
        startTime: "09:00",
        durationMinutes: 30,
        weekdays: [1],
        startsOn: "2026-09-01",
        description: "",
        createdAt: "",
        updatedAt: "",
      },
      new Date("2026-09-12T12:00:00"),
    );
    expect(entries).toHaveLength(4);
    expect(entries.at(-1)?.date).toBe("2026-10-05");
  });
});
