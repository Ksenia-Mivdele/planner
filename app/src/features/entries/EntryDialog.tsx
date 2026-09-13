import { useState } from "react";
import type {
  EntryCategory,
  EntryStatus,
  EntryType,
  PlannerEntry,
  HabitTemplate,
  Weekday,
} from "../../types/planner";
import { timeToMinutes } from "../../lib/schedule";
import "./EntryDialog.css";

type Props = {
  entry: PlannerEntry | null;
  date: string;
  defaultDuration: number;
  onClose: () => void;
  onSave: (entry: PlannerEntry) => Promise<boolean>;
  onSaveHabit: (habit: HabitTemplate) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};
const now = () => new Date().toISOString();
const endTimeFor = (startTime: string, durationMinutes: number) => {
  const total = timeToMinutes(startTime) + durationMinutes;
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export function EntryDialog({
  entry,
  date,
  defaultDuration,
  onClose,
  onSave,
  onSaveHabit,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [type, setType] = useState<EntryType>(entry?.type ?? "task");
  const [category, setCategory] = useState<EntryCategory>(
    entry?.category ?? "personal",
  );
  const [entryDate, setEntryDate] = useState(entry?.date ?? date);
  const [startTime, setStartTime] = useState(entry?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(
    endTimeFor(
      entry?.startTime ?? "09:00",
      entry?.durationMinutes ?? defaultDuration,
    ),
  );
  const [status, setStatus] = useState<EntryStatus>(
    entry?.status ?? "in-progress",
  );
  const [repeats, setRepeats] = useState(false);
  const initialWeekday =
    ((new Date(`${entry?.date ?? date}T12:00:00`).getDay() + 6) % 7) + 1;
  const [weekdays, setWeekdays] = useState<Weekday[]>([
    initialWeekday as Weekday,
  ]);
  const [repeatEndsOn, setRepeatEndsOn] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    if (!title.trim()) {
      setError("Введите название.");
      return;
    }
    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (durationMinutes <= 0 || durationMinutes % 15 !== 0) {
      setError("Окончание должно быть позже начала, с шагом 15 минут.");
      return;
    }
    if (repeats && weekdays.length === 0) {
      setError("Выберите хотя бы один день повторения.");
      return;
    }
    const base = {
      id: entry?.id ?? crypto.randomUUID(),
      type,
      title: title.trim(),
      category,
      date: entryDate,
      startTime,
      durationMinutes,
      description: entry?.description ?? "",
      status,
      createdAt: entry?.createdAt ?? now(),
      updatedAt: now(),
    };
    const saved = repeats
      ? await onSaveHabit({
          id: base.id,
          type,
          title: base.title,
          category,
          startTime,
          durationMinutes,
          weekdays,
          startsOn: entryDate,
          ...(repeatEndsOn ? { endsOn: repeatEndsOn } : {}),
          description: base.description,
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        })
      : await onSave(base);
    if (saved) onClose();
  };
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="entry-dialog"
        aria-modal="true"
        role="dialog"
        aria-label={entry ? "Редактирование записи" : "Новая запись"}
      >
        <header>
          <h2>{entry ? "Редактирование записи" : "Новая запись"}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>
        <label>
          Название
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Тип
            <select
              value={type}
              onChange={(event) => setType(event.target.value as EntryType)}
            >
              <option value="task">Задача</option>
              <option value="meeting">Встреча</option>
              <option value="event">Событие</option>
            </select>
          </label>
          <label>
            Категория
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as EntryCategory)
              }
            >
              <option value="personal">Личная</option>
              <option value="work">Рабочая</option>
            </select>
          </label>
          <label>
            Дата
            <input
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
            />
          </label>
          <label>
            Начало
            <input
              type="time"
              step="900"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            Окончание
            <input
              type="time"
              step="900"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
          <label>
            Статус
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as EntryStatus)}
            >
              <option value="in-progress">В работе</option>
              <option value="done">Готово</option>
            </select>
          </label>
        </div>
        {!entry && (
          <fieldset className="repeat-settings">
            <label className="repeat-toggle">
              <input
                checked={repeats}
                type="checkbox"
                onChange={(event) => setRepeats(event.target.checked)}
              />
              Повторять еженедельно
            </label>
            {repeats && (
              <>
                <div className="weekday-picker" aria-label="Дни повторения">
                  {(["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const).map(
                    (label, index) => {
                      const weekday = (index + 1) as Weekday;
                      return (
                        <label key={weekday}>
                          <input
                            checked={weekdays.includes(weekday)}
                            type="checkbox"
                            onChange={() =>
                              setWeekdays((current) =>
                                current.includes(weekday)
                                  ? current.filter((item) => item !== weekday)
                                  : [...current, weekday],
                              )
                            }
                          />
                          {label}
                        </label>
                      );
                    },
                  )}
                </div>
                <label>
                  Повторять до
                  <input
                    min={entryDate}
                    type="date"
                    value={repeatEndsOn}
                    onChange={(event) => setRepeatEndsOn(event.target.value)}
                  />
                </label>
                <small>Копии создаются максимум на четыре недели вперёд.</small>
              </>
            )}
          </fieldset>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer>
          {entry && (
            <>
              {entry.status !== "done" &&
                entry.date < new Date().toISOString().slice(0, 10) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        await onSave({
                          ...entry,
                          date: new Date().toISOString().slice(0, 10),
                          updatedAt: now(),
                        })
                      )
                        onClose();
                    }}
                  >
                    Перенести на сегодня
                  </button>
                )}
              <button
                className="delete-button"
                type="button"
                onClick={async () => {
                  if (window.confirm("Удалить запись?")) {
                    if (await onDelete(entry.id)) onClose();
                  }
                }}
              >
                Удалить
              </button>
            </>
          )}
          <span />
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-button" type="button" onClick={save}>
            Сохранить
          </button>
        </footer>
      </section>
    </div>
  );
}
