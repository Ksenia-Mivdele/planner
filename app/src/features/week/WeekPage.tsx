import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfToday,
  subWeeks,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { deleteEntry, listEntries, saveEntry } from "../../db/database";
import { EntryDialog } from "../entries/EntryDialog";
import {
  calculateFreeMinutes,
  getDayAvailability,
  getWeekDates,
  getWeekStart,
  minutesToTime,
  timeToMinutes,
} from "../../lib/schedule";
import type {
  AppSettings,
  PlannerEntry,
  TimeInterval,
} from "../../types/planner";
import "./WeekPage.css";

type Props = { settings: AppSettings };
const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const slots = Array.from({ length: 96 }, (_, index) => index * 15);
const formatFree = (minutes: number) =>
  `${Math.floor(minutes / 60)} ч ${String(minutes % 60).padStart(2, "0")} мин`;

const Zone = ({
  interval,
  kind,
}: {
  interval: TimeInterval | null;
  kind: "work" | "personal";
}) =>
  interval ? (
    <div
      className={`calendar-zone ${kind}`}
      style={{
        top: `${timeToMinutes(interval.start) / 14.4}%`,
        height: `${(timeToMinutes(interval.end) - timeToMinutes(interval.start)) / 14.4}%`,
      }}
    >
      <span>{kind === "work" ? "Работа" : "Личное"}</span>
    </div>
  ) : null;

export function WeekPage({ settings }: Props) {
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [showCompleted, setShowCompleted] = useState(true);
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<
    PlannerEntry | null | undefined
  >(undefined);
  useEffect(() => {
    void listEntries().then(setEntries);
  }, []);
  const persistEntry = async (entry: PlannerEntry) => {
    await saveEntry(entry);
    setEntries((current) => [
      ...current.filter((item) => item.id !== entry.id),
      entry,
    ]);
  };
  const removeEntry = async (id: string) => {
    await deleteEntry(id);
    setEntries((current) => current.filter((item) => item.id !== id));
  };
  const dates = useMemo(
    () => getWeekDates(currentDate).map((date) => new Date(`${date}T12:00:00`)),
    [currentDate],
  );
  const weekStart = getWeekStart(currentDate);
  const totalFree = dates.reduce(
    (sum, date) =>
      sum +
      calculateFreeMinutes({
        date,
        availability: settings.availability,
        entries,
      }),
    0,
  );

  return (
    <main className="week-page">
      <header className="week-toolbar">
        <div>
          <p className="eyebrow">Календарь</p>
          <h1>Моя неделя</h1>
          <p>
            {format(weekStart, "d MMMM", { locale: ru })} -{" "}
            {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: ru })}
          </p>
        </div>
        <div className="week-actions">
          <button
            type="button"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            ← Назад
          </button>
          <button type="button" onClick={() => setCurrentDate(startOfToday())}>
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
          >
            Вперёд →
          </button>
          <label>
            <input
              checked={showCompleted}
              type="checkbox"
              onChange={(event) => setShowCompleted(event.target.checked)}
            />{" "}
            Показывать готовые
          </label>
        </div>
      </header>
      <p className="week-total">
        Свободно на неделе: <strong>{formatFree(totalFree)}</strong>
      </p>
      <section className="week-grid" aria-label="Недельный календарь">
        {dates.map((date, index) => {
          const availability = getDayAvailability(date, settings.availability);
          const free = calculateFreeMinutes({
            date,
            availability: settings.availability,
            entries,
          });
          return (
            <article className="day-column" key={date.toISOString()}>
              <header>
                <span>{labels[index]}</span>
                <strong>{format(date, "d", { locale: ru })}</strong>
                {isSameDay(date, startOfToday()) && <em>сегодня</em>}
                <small>Свободно: {formatFree(free)}</small>
              </header>
              <div
                className="time-scale"
                aria-label={`Временная сетка ${labels[index]}`}
              >
                {slots.map((minute) => (
                  <div className="time-slot" key={minute}>
                    {minute % 60 === 0 ? (
                      <span>{minutesToTime(minute)}</span>
                    ) : null}
                  </div>
                ))}
                {availability?.isDayOff ? (
                  <div className="day-off">Выходной</div>
                ) : (
                  <>
                    <Zone interval={availability?.work ?? null} kind="work" />
                    <Zone
                      interval={availability?.personal ?? null}
                      kind="personal"
                    />
                  </>
                )}
                {entries
                  .filter(
                    (entry) =>
                      entry.date === format(date, "yyyy-MM-dd") &&
                      (showCompleted || entry.status !== "done"),
                  )
                  .map((entry) => (
                    <button
                      className={`entry-card ${entry.category} ${entry.status === "done" ? "done" : ""}`}
                      key={entry.id}
                      style={{
                        top: `${timeToMinutes(entry.startTime) / 14.4}%`,
                        height: `${Math.max(3, entry.durationMinutes / 14.4)}%`,
                      }}
                      type="button"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      {entry.title}
                    </button>
                  ))}
              </div>
            </article>
          );
        })}
      </section>
      <button
        className="floating-add"
        type="button"
        aria-label="Добавить запись"
        onClick={() => setSelectedEntry(null)}
      >
        +
      </button>
      {selectedEntry !== undefined && (
        <EntryDialog
          entry={selectedEntry}
          date={format(currentDate, "yyyy-MM-dd")}
          defaultDuration={settings.defaultDurationMinutes}
          onClose={() => setSelectedEntry(undefined)}
          onSave={persistEntry}
          onDelete={removeEntry}
        />
      )}
    </main>
  );
}
