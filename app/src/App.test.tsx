import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";
describe("маршруты приложения", () => {
  it("направляет пользователя без настройки на экран первоначальной настройки", async () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Настроим вашу неделю" }),
    ).toBeInTheDocument();
  });
});
