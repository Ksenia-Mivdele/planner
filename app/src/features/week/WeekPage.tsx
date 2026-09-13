import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfToday,
  subWeeks,
} from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";
import { EntryDialog } from "../entries/EntryDialog";
import { useEntries } from "../entries/useEntries";
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
const CALENDAR_START = 0;
const CALENDAR_DURATION = 24 * 60;
const slots = Array.from(
  { length: 96 },
  (_, index) => CALENDAR_START + index * 15,
);
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
        top: `${((timeToMinutes(interval.start) - CALENDAR_START) / CALENDAR_DURATION) * 100}%`,
        height: `${((timeToMinutes(interval.end) - timeToMinutes(interval.start)) / CALENDAR_DURATION) * 100}%`,
      }}
    />
  ) : null;

export function WeekPage({ settings }: Props) {
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<
    PlannerEntry | null | undefined
  >(undefined);
  const [undoEntry, setUndoEntry] = useState<PlannerEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { entries, error: entriesError, remove, save } = useEntries();
  const persistEntry = async (entry: PlannerEntry): Promise<boolean> => {
    try {
      await save(entry);
      setNotice(null);
      return true;
    } catch {
      setNotice(
        "Не удалось сохранить запись. Проверьте данные и повторите попытку.",
      );
      return false;
    }
  };
  const removeEntry = async (id: string): Promise<boolean> => {
    try {
      await remove(id);
      setNotice(null);
      return true;
    } catch {
      setNotice("Не удалось удалить запись. Повторите попытку.");
      return false;
    }
  };
  const moveEntry = async (
    entry: PlannerEntry,
    date: string,
    startTime: string,
  ) => {
    setUndoEntry(entry);
    if (timeToMinutes(startTime) + entry.durationMinutes > 24 * 60) {
      setNotice("Запись нельзя перенести за границу суток.");
      return;
    }
    await persistEntry({
      ...entry,
      date,
      startTime,
      updatedAt: new Date().toISOString(),
    });
  };
  const resizeEntry = async (entry: PlannerEntry, delta: number) => {
    setUndoEntry(entry);
    const durationMinutes = Math.max(
      15,
      Math.min(
        24 * 60 - timeToMinutes(entry.startTime),
        entry.durationMinutes + delta,
      ),
    );
    if (durationMinutes === entry.durationMinutes) {
      setNotice("Длительность записи не может выйти за границы суток.");
      return;
    }
    await persistEntry({
      ...entry,
      durationMinutes,
      updatedAt: new Date().toISOString(),
    });
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
            Показать завершённые
          </label>
          {undoEntry && (
            <button
              type="button"
              onClick={() => {
                void persistEntry(undoEntry);
                setUndoEntry(null);
              }}
            >
              Отменить перенос
            </button>
          )}
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
                  <div
                    className="time-slot"
                    key={minute}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const entry = entries.find(
                        (item) =>
                          item.id === event.dataTransfer.getData("text/plain"),
                      );
                      if (entry)
                        void moveEntry(
                          entry,
                          format(date, "yyyy-MM-dd"),
                          minutesToTime(minute),
                        );
                    }}
                  />
                ))}
                <Zone interval={availability?.work ?? null} kind="work" />
                <Zone
                  interval={availability?.personal ?? null}
                  kind="personal"
                />
                {entries
                  .filter(
                    (entry) =>
                      entry.date === format(date, "yyyy-MM-dd") &&
                      (showCompleted || entry.status !== "done"),
                  )
                  .map((entry) => (
                    <article
                      aria-label={`${entry.title}, ${entry.durationMinutes} минут`}
                      className={`entry-card ${entry.category} ${entry.status === "done" ? "done" : ""}`}
                      key={entry.id}
                      draggable
                      style={{
                        top: `${((timeToMinutes(entry.startTime) - CALENDAR_START) / CALENDAR_DURATION) * 100}%`,
                        height: `${Math.max(3, (entry.durationMinutes / CALENDAR_DURATION) * 100)}%`,
                      }}
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/plain", entry.id)
                      }
                    >
                      <button
                        className="entry-card-open"
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        {entry.date < format(startOfToday(), "yyyy-MM-dd") &&
                        entry.status !== "done"
                          ? "● "
                          : ""}
                        {entry.title}
                      </button>
                      <span className="resize-controls">
                        <button
                          aria-label={`Уменьшить длительность: ${entry.title}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void resizeEntry(entry, -15);
                          }}
                        >
                          −
                        </button>
                        <button
                          aria-label={`Увеличить длительность: ${entry.title}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void resizeEntry(entry, 15);
                          }}
                        >
                          +
                        </button>
                      </span>
                    </article>
                  ))}
              </div>
            </article>
          );
        })}
      </section>
      {(notice || entriesError) && (
        <p className="form-error" role="alert">
          {notice ?? entriesError}
        </p>
      )}
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
