import { useState } from "react";
import type {
  EntryCategory,
  EntryStatus,
  EntryType,
  PlannerEntry,
} from "../../types/planner";
import { timeToMinutes } from "../../lib/schedule";
import "./EntryDialog.css";

type Props = {
  entry: PlannerEntry | null;
  date: string;
  defaultDuration: number;
  onClose: () => void;
  onSave: (entry: PlannerEntry) => Promise<boolean>;
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
  const [error, setError] = useState("");
  const save = async () => {
    if (!title.trim()) {
      setError("Введите название.");
      return;
    }
    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (durationMinutes <= 0) {
      setError("Время окончания должно быть позже времени начала.");
      return;
    }
    const saved = await onSave({
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
    });
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
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            Окончание
            <input
              type="time"
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
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer>
          {entry && (
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
