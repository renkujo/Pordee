import { expect, test } from "./fixtures";

const datePickerLabel = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthPickerLabel = new Intl.DateTimeFormat("th-TH", {
  month: "long",
  year: "numeric",
});

function dayValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("dashboard reflects month income/expense after adding rows", async ({
  page,
}) => {
  const stamp = Date.now();
  const incomeTitle = `เงินเดือนทดสอบ-${stamp}`;
  const expenseTitle = `กาแฟแดชบอร์ด-${stamp}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  // Seed an income via the /add flow.
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${incomeTitle} 25000`);
  await expect(page.locator("#amount")).toHaveValue("25000");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Seed an expense via the /add flow.
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${expenseTitle} 65`);
  await expect(page.locator("#amount")).toHaveValue("65");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Dashboard should show the new totals + a recent list.
  await page.goto("/");
  await expect(page.getByTestId("income-badge")).not.toContainText("฿0");
  await expect(page.getByTestId("recent-list")).toBeVisible();
  await expect(page.getByTestId("recent-list")).toContainText(expenseTitle);
  await expect(page.getByTestId("recent-list")).toContainText(incomeTitle);
  await expect(page.getByTestId("expense-badge")).not.toContainText("฿0");
});

test("dashboard keeps custom day query on the selected month", async ({
  page,
}) => {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(
    `/?date=${dayValue(today)}&from=${dayValue(previousMonthEnd)}&to=${dayValue(today)}`
  );
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText(monthPickerLabel.format(currentMonthStart)).first()
  ).toBeVisible();
  await expect(
    page.getByText(datePickerLabel.format(previousMonthEnd))
  ).toHaveCount(0);
});
