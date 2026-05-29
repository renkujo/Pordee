import { expect, test } from "@playwright/test";

test("dashboard reflects month income/expense after adding rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  // Seed an income via the /add flow.
  await page.goto("/add");
  await page.locator("#quick-entry").fill("เงินเดือน 25000");
  await expect(page.locator("#amount")).toHaveValue("25000");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Seed an expense via the /add flow.
  await page.goto("/add");
  await page.locator("#quick-entry").fill("กาแฟ 65");
  await expect(page.locator("#amount")).toHaveValue("65");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Dashboard should show the new totals + a recent list.
  await page.goto("/");
  await expect(page.getByTestId("income-badge")).toContainText("25,000");
  await expect(page.getByTestId("recent-list")).toBeVisible();
  await expect(page.getByTestId("recent-list")).toContainText("กาแฟ");
  await expect(page.getByTestId("recent-list")).toContainText("เงินเดือน");
  // expense-badge accumulates with the in-memory store across tests; only
  // assert that it is non-zero (the seeded ฿65 lifts it past 0).
  await expect(page.getByTestId("expense-badge")).not.toContainText("฿0");
});
