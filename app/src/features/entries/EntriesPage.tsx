import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEntries } from "./useEntries";
import "./EntriesPage.css";

const typeLabels = {
  task: "Задача",
  meeting: "Встреча",
  event: "Событие",
} as const;
export function EntriesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const navigate = useNavigate();
  const { entries, error, isLoading } = useEntries();
  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query.toLowerCase()) &&
          (category === "all" || entry.category === category) &&
          (type === "all" || entry.type === type) &&
          (status === "all" || entry.status === status),
      ),
    [entries, query, category, type, status],
  );
  return (
    <main className="entries-page">
      <p className="eyebrow">Обзор</p>
      <h1>Все записи</h1>
      <div className="entry-filters">
        <input
          placeholder="Поиск по названию"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Категория"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Все категории</option>
          <option value="personal">Личные</option>
          <option value="work">Рабочие</option>
        </select>
        <select
          aria-label="Тип"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="all">Все типы</option>
          <option value="task">Задачи</option>
          <option value="meeting">Встречи</option>
          <option value="event">События</option>
        </select>
        <select
          aria-label="Статус"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="in-progress">В работе</option>
          <option value="done">Готово</option>
        </select>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <p className="empty-state">Загружаем записи...</p>
      ) : filtered.length ? (
        <div className="entries-table">
          {filtered.map((entry) => (
            <button
              className={`entry-row ${entry.category}`}
              key={entry.id}
              type="button"
              onClick={() => navigate(`/week?date=${entry.date}`)}
            >
              <strong>{entry.title}</strong>
              <span>{typeLabels[entry.type]}</span>
              <span>
                {entry.date} · {entry.startTime}
              </span>
              <span>{entry.status === "done" ? "Готово" : "В работе"}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state">Записей по этим условиям нет.</p>
      )}
    </main>
  );
}
