import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("маршруты приложения", () => {
  it("отображает экран первоначальной настройки по неизвестному адресу", () => {
    window.history.pushState({}, "", "/unknown");

    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Настроим вашу неделю" }),
    ).toBeInTheDocument();
  });
});
