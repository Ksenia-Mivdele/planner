import { useState } from "react";
import type {
  EntryCategory,
  EntryStatus,
  EntryType,
  PlannerEntry,
} from "../../types/planner";
import "./EntryDialog.css";

type Props = {
  entry: PlannerEntry | null;
  date: string;
  defaultDuration: number;
  onClose: () => void;
  onSave: (entry: PlannerEntry) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};
const now = () => new Date().toISOString();

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
  const [durationMinutes, setDurationMinutes] = useState(
    entry?.durationMinutes ?? defaultDuration,
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
    await onSave({
      id: entry?.id ?? crypto.randomUUID(),
      type,
      title: title.trim(),
      category,
      date: entryDate,
      startTime,
      durationMinutes,
      description: entry?.description ?? "",
      status,
      subtasks: entry?.subtasks ?? [],
      createdAt: entry?.createdAt ?? now(),
      updatedAt: now(),
    });
    onClose();
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
              <option value="event">Событие</option>
              <option value="habit">Привычка</option>
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
            Время
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            Длительность
            <select
              value={durationMinutes}
              onChange={(event) =>
                setDurationMinutes(Number(event.target.value))
              }
            >
              {[15, 30, 45, 60, 90, 120, 180].map((value) => (
                <option key={value} value={value}>
                  {value < 60 ? `${value} мин` : `${value / 60} ч`}
                </option>
              ))}
            </select>
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
                  await onDelete(entry.id);
                  onClose();
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
