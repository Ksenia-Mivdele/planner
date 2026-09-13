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
import { useLocation } from "react-router-dom";
import { ensureHabitOccurrences, saveHabit } from "../../db/database";
import {
  calculateFreeMinutes,
  findConflictingEntries,
  getDayAvailability,
  getWeekDates,
  getWeekStart,
  mergeIntervals,
  minutesToTime,
  toMinuteInterval,
  timeToMinutes,
} from "../../lib/schedule";
import type {
  AppSettings,
  PlannerEntry,
  TimeInterval,
} from "../../types/planner";
import { EntryDialog } from "../entries/EntryDialog";
import { useEntries } from "../entries/useEntries";
import "./WeekPage.css";

type Props = { settings: AppSettings };
const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const typeIcons = { task: "✓", meeting: "◌", event: "✦" } as const;
const formatFree = (minutes: number) =>
  `${Math.floor(minutes / 60)} ч ${String(minutes % 60).padStart(2, "0")} мин`;

function Zone({
  interval,
  kind,
  slots,
}: {
  interval: TimeInterval | null;
  kind: "work" | "personal" | "unavailable";
  slots: number[];
}) {
  if (!interval) return null;
  const positions = slots
    .map((minute, index) =>
      minute >= timeToMinutes(interval.start) &&
      minute < timeToMinutes(interval.end)
        ? index
        : -1,
    )
    .filter((index) => index >= 0);
  const groups = positions.reduce<number[][]>((result, index) => {
    const previous = result.at(-1);
    if (previous && index === previous.at(-1)! + 1) previous.push(index);
    else result.push([index]);
    return result;
  }, []);
  return (
    <>
      {groups.map((group) => (
        <div
          className={`calendar-zone ${kind}`}
          key={group[0]}
          aria-label={kind === "unavailable" ? "Недоступное время" : undefined}
          title={kind === "unavailable" ? "Недоступно" : undefined}
          style={{
            top: `${(group[0] / slots.length) * 100}%`,
            height: `${(group.length / slots.length) * 100}%`,
          }}
        />
      ))}
    </>
  );
}

const getVisibleSlots = (
  availability: ReturnType<typeof getDayAvailability>,
  entries: PlannerEntry[],
  date: string,
  showAllHours: boolean,
) => {
  if (showAllHours) return Array.from({ length: 96 }, (_, index) => index * 15);
  const intervals = [
    availability?.isDayOff ? null : availability?.work,
    availability?.personal,
    ...(availability?.unavailable ?? []),
    ...entries
      .filter((entry) => entry.date === date)
      .map((entry) => ({
        start: entry.startTime,
        end: minutesToTime(
          Math.min(
            24 * 60,
            timeToMinutes(entry.startTime) + entry.durationMinutes,
          ),
        ),
      })),
  ]
    .filter((interval): interval is TimeInterval => interval !== null)
    .map(toMinuteInterval);
  return mergeIntervals(intervals).flatMap((interval) =>
    Array.from(
      { length: Math.floor((interval.end - interval.start) / 15) },
      (_, index) => interval.start + index * 15,
    ),
  );
};

export function WeekPage({ settings }: Props) {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(() => {
    const date = new URLSearchParams(location.search).get("date");
    return date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T12:00:00`)
      : startOfToday();
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<
    PlannerEntry | null | undefined
  >(undefined);
  const [undoEntry, setUndoEntry] = useState<PlannerEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { entries, error: entriesError, reload, remove, save } = useEntries();

  useEffect(() => {
    void ensureHabitOccurrences().then((created) => {
      if (created) void reload();
    });
  }, [reload]);

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
  const conflictIds = useMemo(
    () =>
      new Set(
        findConflictingEntries(entries).flatMap(([first, second]) => [
          first.id,
          second.id,
        ]),
      ),
    [entries],
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
          <button
            type="button"
            onClick={() => setShowAllHours((value) => !value)}
          >
            {showAllHours ? "Свернуть часы" : "Показать все часы"}
          </button>
          {undoEntry && (
            <button
              type="button"
              onClick={() => {
                void persistEntry(undoEntry);
                setUndoEntry(null);
              }}
            >
              Отменить изменение
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
          const dateKey = format(date, "yyyy-MM-dd");
          const slots = getVisibleSlots(
            availability,
            entries,
            dateKey,
            showAllHours,
          );
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
                style={{ height: `${Math.max(120, slots.length * 7.5)}px` }}
              >
                {slots.map((minute) => (
                  <div className="time-slot" key={minute} />
                ))}
                <Zone
                  interval={availability?.work ?? null}
                  kind="work"
                  slots={slots}
                />
                <Zone
                  interval={availability?.personal ?? null}
                  kind="personal"
                  slots={slots}
                />
                {availability?.unavailable.map((interval, unavailableIndex) => (
                  <Zone
                    key={`${interval.start}-${unavailableIndex}`}
                    interval={interval}
                    kind="unavailable"
                    slots={slots}
                  />
                ))}
                {entries
                  .filter(
                    (entry) =>
                      entry.date === dateKey &&
                      (showCompleted || entry.status !== "done"),
                  )
                  .map((entry) => (
                    <article
                      aria-label={`${entry.title}, ${entry.durationMinutes} минут`}
                      className={`entry-card ${entry.category} ${entry.status === "done" ? "done" : ""} ${conflictIds.has(entry.id) ? "conflict" : ""}`}
                      key={entry.id}
                      style={{
                        top: `${(slots.indexOf(timeToMinutes(entry.startTime)) / slots.length) * 100}%`,
                        height: `${Math.max(3, (entry.durationMinutes / 15 / slots.length) * 100)}%`,
                      }}
                    >
                      <button
                        className="entry-card-open"
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <span className="entry-card-title">
                          <span className="entry-type-icon" aria-hidden="true">
                            {typeIcons[entry.type]}
                          </span>{" "}
                          {conflictIds.has(entry.id) ? "⚠ " : ""}
                          {entry.date < format(startOfToday(), "yyyy-MM-dd") &&
                          entry.status !== "done"
                            ? "● "
                            : ""}
                          {entry.title}
                        </span>
                        <span className="entry-card-time">
                          {entry.startTime} -{" "}
                          {minutesToTime(
                            timeToMinutes(entry.startTime) +
                              entry.durationMinutes,
                          )}
                        </span>
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
          onSaveHabit={async (habit) => {
            try {
              await saveHabit(habit);
              await ensureHabitOccurrences();
              await reload();
              return true;
            } catch {
              setNotice("Не удалось сохранить повторение. Повторите попытку.");
              return false;
            }
          }}
          onDelete={removeEntry}
        />
      )}
    </main>
  );
}
