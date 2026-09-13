import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  AppSettings,
  DayAvailability,
  TimeInterval,
  Weekday,
} from "../../types/planner";
import "./SetupPage.css";

const labels: Record<Weekday, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье",
};
type Props = {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
};
const defaultUnavailable = (): TimeInterval => ({
  start: "13:00",
  end: "14:00",
});

const valid = (days: DayAvailability[]) =>
  days.every((day) =>
    [day.work, day.personal, ...day.unavailable]
      .filter((value): value is TimeInterval => value !== null)
      .every(({ start, end }) => end > start),
  );

export function SetupPage({ settings, onSave }: Props) {
  const navigate = useNavigate();
  const [days, setDays] = useState(settings.availability);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const change = (
    weekday: Weekday,
    callback: (day: DayAvailability) => DayAvailability,
  ) =>
    setDays((current) =>
      current.map((day) => (day.weekday === weekday ? callback(day) : day)),
    );
  const setTime = (
    weekday: Weekday,
    kind: "work" | "personal",
    field: keyof TimeInterval,
    value: string,
  ) =>
    change(weekday, (day) => ({
      ...day,
      [kind]: {
        ...(day[kind] ?? { start: "09:00", end: "18:00" }),
        [field]: value,
      },
    }));
  const save = async () => {
    if (!valid(days)) {
      setError("Окончание каждого интервала должно быть позже начала.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...settings,
        availability: days,
        hasCompletedInitialSetup: true,
      });
      navigate("/week");
    } catch {
      setError("Не удалось сохранить расписание. Повторите попытку.");
      setSaving(false);
    }
  };
  return (
    <main className="setup-page">
      <section className="setup-intro">
        <p className="eyebrow">Настройки недели</p>
        <h1>Настроим вашу неделю</h1>
        <p>
          Укажите время для работы, личных дел и периодов, в которые вы
          недоступны.
        </p>
      </section>
      <section className="setup-list" aria-label="Расписание недели">
        {[...days]
          .sort((a, b) => a.weekday - b.weekday)
          .map((day) => (
            <article className="setup-day" key={day.weekday}>
              <div className="setup-day-header">
                <h2>{labels[day.weekday]}</h2>
                <label>
                  <input
                    checked={day.isDayOff}
                    type="checkbox"
                    onChange={(event) =>
                      change(day.weekday, (current) => ({
                        ...current,
                        isDayOff: event.target.checked,
                      }))
                    }
                  />{" "}
                  Выходной от работы
                </label>
              </div>
              <div className="time-groups">
                {(["work", "personal"] as const).map((kind) => (
                  <div className="time-group" key={kind}>
                    <span>{kind === "work" ? "Работа" : "Личное"}</span>
                    <input
                      aria-label={`${labels[day.weekday]}: начало ${kind}`}
                      disabled={kind === "work" && day.isDayOff}
                      type="time"
                      value={day[kind]?.start ?? ""}
                      onChange={(event) =>
                        setTime(day.weekday, kind, "start", event.target.value)
                      }
                    />
                    <span>-</span>
                    <input
                      aria-label={`${labels[day.weekday]}: окончание ${kind}`}
                      disabled={kind === "work" && day.isDayOff}
                      type="time"
                      value={day[kind]?.end ?? ""}
                      onChange={(event) =>
                        setTime(day.weekday, kind, "end", event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="unavailable">
                <span>Недоступно</span>
                {day.unavailable.map((interval, index) => (
                  <div className="time-group" key={index}>
                    <input
                      aria-label={`${labels[day.weekday]}: недоступно начало ${index + 1}`}
                      disabled={false}
                      type="time"
                      value={interval.start}
                      onChange={(event) =>
                        change(day.weekday, (current) => ({
                          ...current,
                          unavailable: current.unavailable.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, start: event.target.value }
                                : item,
                          ),
                        }))
                      }
                    />
                    <span>-</span>
                    <input
                      aria-label={`${labels[day.weekday]}: недоступно окончание ${index + 1}`}
                      disabled={false}
                      type="time"
                      value={interval.end}
                      onChange={(event) =>
                        change(day.weekday, (current) => ({
                          ...current,
                          unavailable: current.unavailable.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, end: event.target.value }
                                : item,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={false}
                      onClick={() =>
                        change(day.weekday, (current) => ({
                          ...current,
                          unavailable: current.unavailable.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      Удалить
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    change(day.weekday, (current) => ({
                      ...current,
                      unavailable: [
                        ...current.unavailable,
                        defaultUnavailable(),
                      ],
                    }))
                  }
                >
                  + Добавить недоступное время
                </button>
              </div>
            </article>
          ))}
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="setup-actions">
        <button
          className="primary-button"
          disabled={saving}
          type="button"
          onClick={save}
        >
          {saving ? "Сохраняем..." : "Сохранить и открыть календарь"}
        </button>
      </div>
    </main>
  );
}
