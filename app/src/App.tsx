import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="placeholder-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </main>
  );
}

function App() {
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
            <PlaceholderPage
              eyebrow="Первый запуск"
              title="Настроим вашу неделю"
              description="Здесь появится настройка рабочего, личного и недоступного времени."
            />
          }
        />
        <Route
          path="/week"
          element={
            <PlaceholderPage
              eyebrow="Календарь"
              title="Моя неделя"
              description="Здесь появится недельный календарь, записи и свободное время."
            />
          }
        />
        <Route
          path="/entries"
          element={
            <PlaceholderPage
              eyebrow="Обзор"
              title="Все записи"
              description="Здесь появятся поиск, фильтры и список задач, событий и привычек."
            />
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
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    </div>
  );
}

export default App;
