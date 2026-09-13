import { expect, test } from "@playwright/test";

const completeSetup = async (page: import("@playwright/test").Page) => {
  await page.goto("/setup");
  await page
    .getByRole("button", { name: "Сохранить и открыть календарь" })
    .click();
  await expect(page).toHaveURL(/\/week$/);
};

test("создаёт встречу с временем начала и окончания", async ({ page }) => {
  await completeSetup(page);
  await page.getByRole("button", { name: "Добавить запись" }).click();
  await page.getByLabel("Название").fill("Встреча команды");
  await page.getByLabel("Тип").selectOption("meeting");
  await page.getByLabel("Начало").fill("10:00");
  await page.getByLabel("Окончание").fill("11:30");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Встреча команды")).toBeVisible();
});

test("сохраняет выбранную тему после перезагрузки", async ({ page }) => {
  await completeSetup(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Тёмная" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
