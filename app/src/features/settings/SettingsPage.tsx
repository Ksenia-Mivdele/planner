import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearAllData,
  exportPlannerData,
  importPlannerData,
} from "../../db/database";
import type { AppSettings } from "../../types/planner";
import "./SettingsPage.css";

type Props = {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
  onDataImported: (settings: AppSettings) => void;
  onReset: () => void;
};

export function SettingsPage({
  settings,
  onSettingsChange,
  onDataImported,
  onReset,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const setTheme = async (theme: AppSettings["theme"]) => {
    await onSettingsChange({ ...settings, theme });
    setMessage(
      theme === "dark" ? "Тёмная тема включена." : "Светлая тема включена.",
    );
  };
  const exportData = async () => {
    const data = await exportPlannerData();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "planner-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Резервная копия подготовлена.");
  };
  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!window.confirm("Импорт заменит текущие данные. Продолжить?")) return;
      const imported = await importPlannerData(data);
      onDataImported(imported.settings);
      setMessage("Данные импортированы.");
      navigate("/week", { replace: true });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось импортировать файл.",
      );
    }
  };
  return (
    <main className="entries-page">
      <p className="eyebrow">Параметры</p>
      <h1>Настройки</h1>
      <section className="settings-section">
        <h2>Ваше расписание</h2>
        <p>
          Задайте время для дел и личного времени отдельно для каждого дня
          недели.
        </p>
        <button
          className="primary-button"
          type="button"
          onClick={() => navigate("/setup")}
        >
          Настроить неделю
        </button>
      </section>
      <section className="settings-section">
        <h2>Цветовая гамма</h2>
        <p>Выберите оформление, которое комфортно для глаз.</p>
        <div className="theme-options" role="group" aria-label="Выбор темы">
          <button
            className={
              settings.theme === "light"
                ? "theme-option active"
                : "theme-option"
            }
            type="button"
            onClick={() => void setTheme("light")}
          >
            Светлая
          </button>
          <button
            className={
              settings.theme === "dark" ? "theme-option active" : "theme-option"
            }
            type="button"
            onClick={() => void setTheme("dark")}
          >
            Тёмная
          </button>
        </div>
      </section>
      <section className="settings-section entries-table">
        <h2>Данные</h2>
        <button
          type="button"
          className="entry-row"
          onClick={() => void exportData()}
        >
          Экспортировать данные в JSON
        </button>
        <button
          type="button"
          className="entry-row"
          onClick={() => fileRef.current?.click()}
        >
          Импортировать данные из JSON
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/json"
          onChange={(event) => void importData(event)}
        />
        <button
          type="button"
          className="entry-row"
          onClick={async () => {
            if (window.confirm("Удалить все данные Планировщика?")) {
              await clearAllData();
              onReset();
            }
          }}
        >
          Очистить все данные
        </button>
      </section>
      {message && <p className="empty-state">{message}</p>}
    </main>
  );
}
