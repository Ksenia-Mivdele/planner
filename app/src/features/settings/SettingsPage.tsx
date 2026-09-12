import { useRef, useState } from "react";
import {
  clearAllData,
  exportPlannerData,
  importPlannerData,
} from "../../db/database";
export function SettingsPage({ onReset }: { onReset: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
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
      await importPlannerData(data);
      setMessage("Данные импортированы.");
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
      <div className="entries-table">
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
      </div>
      {message && <p className="empty-state">{message}</p>}
    </main>
  );
}
