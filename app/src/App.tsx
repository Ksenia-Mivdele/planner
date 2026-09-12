import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { getSettings, saveSettings } from "./db/database";
import { SetupPage } from "./features/setup/SetupPage";
import type { AppSettings } from "./types/planner";
import "./App.css";

const PlaceholderPage = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => (
  <main className="placeholder-page">
    <p className="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    <p>{description}</p>
  </main>
);

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  if (!settings)
    return <main className="loading-page">Загружаем Планировщик...</main>;
  const needsSetup = !settings.hasCompletedInitialSetup;
  const persistSettings = async (next: AppSettings) => {
    await saveSettings(next);
    setSettings(next);
  };
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/week">
          Планировщик
        </NavLink>
        <nav aria-label="Основная навигация">
          <NavLink to="/week">Неделя</NavLink>
          <NavLink to="/entries">Все записи</NavLink>
          <NavLink to="/settings">Настройки</NavLink>
        </nav>
      </header>
      <Routes>
        <Route
          path="/setup"
          element={
            needsSetup ? (
              <SetupPage settings={settings} onSave={persistSettings} />
            ) : (
              <Navigate replace to="/week" />
            )
          }
        />
        <Route
          path="/week"
          element={
            needsSetup ? (
              <Navigate replace to="/setup" />
            ) : (
              <PlaceholderPage
                eyebrow="Календарь"
                title="Моя неделя"
                description="Здесь появится недельный календарь, записи и свободное время."
              />
            )
          }
        />
        <Route
          path="/entries"
          element={
            needsSetup ? (
              <Navigate replace to="/setup" />
            ) : (
              <PlaceholderPage
                eyebrow="Обзор"
                title="Все записи"
                description="Здесь появятся поиск, фильтры и список задач, событий и привычек."
              />
            )
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderPage
              eyebrow="Параметры"
              title="Настройки"
              description="Здесь появятся тема, экспорт, импорт и управление данными."
            />
          }
        />
        <Route
          path="*"
          element={<Navigate replace to={needsSetup ? "/setup" : "/week"} />}
        />
      </Routes>
    </div>
  );
}
export default App;
