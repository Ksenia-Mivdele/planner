import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { getSettings, saveSettings } from "./db/database";
import { SetupPage } from "./features/setup/SetupPage";
import { WeekPage } from "./features/week/WeekPage";
import { EntriesPage } from "./features/entries/EntriesPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { createDefaultSettings } from "./types/planner";
import type { AppSettings } from "./types/planner";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (settings) document.documentElement.dataset.theme = settings.theme;
  }, [settings]);
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
          Привет, Ксения! Сегодня тебя ждут великие дела
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
          element={<SetupPage settings={settings} onSave={persistSettings} />}
        />
        <Route
          path="/week"
          element={
            needsSetup ? (
              <Navigate replace to="/setup" />
            ) : (
              <WeekPage settings={settings} />
            )
          }
        />
        <Route
          path="/entries"
          element={
            needsSetup ? <Navigate replace to="/setup" /> : <EntriesPage />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              settings={settings}
              onSettingsChange={persistSettings}
              onReset={() => setSettings(createDefaultSettings())}
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
