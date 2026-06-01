import { expect, type Page, test } from "./fixtures";

async function addTransaction(page: Page, text: string) {
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(text);
  await expect(page.locator("#amount")).not.toHaveValue("");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);
}

test("history filters by month, kind, and category", async ({ page }) => {
  const stamp = Date.now();
  const food = `อาหารกรอง-${stamp}`;
  const travel = `เดินทางกรอง-${stamp}`;
  const income = `เงินเดือนกรอง-${stamp}`;

  await page.setViewportSize({ width: 1280, height: 800 });

  await addTransaction(page, `${food} 65`);
  await addTransaction(page, `${travel} แท็กซี่ 120`);
  await addTransaction(page, `${income} 30000`);

  await page.goto("/history");
  await page.waitForLoadState("networkidle");

  await page.getByRole("combobox", { name: "ช่วงเวลา" }).click();
  await page.getByRole("option", { name: "เดือนนี้" }).click();

  await page.getByRole("combobox", { name: "ประเภท" }).click();
  await page.getByRole("option", { name: "รายจ่าย" }).click();

  await page.getByRole("combobox", { name: "หมวด" }).click();
  await page.getByRole("option", { name: "อาหาร" }).click();

  await expect(page.getByText("รายจ่ายตามตัวกรอง")).toBeVisible();
  await expect(
    page.getByText(/กำลังแสดง[\s\S]*สรุปยอดตามตัวกรองนี้/)
  ).toBeVisible();
  await expect(page.getByTestId("history-list")).toContainText(food);
  await expect(
    page.getByRole("link", { name: new RegExp(travel) })
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: new RegExp(income) })
  ).toHaveCount(0);

  await page.getByRole("combobox", { name: "ช่วงเวลา" }).click();
  await page.getByRole("option", { name: "เดือนก่อน" }).click();
  await expect(page.getByRole("link", { name: new RegExp(food) })).toHaveCount(
    0
  );

  await page.getByRole("button", { name: "ล้างตัวกรอง" }).click();
  await expect(page.getByTestId("history-list")).toContainText(food);
  await expect(page.getByTestId("history-list")).toContainText(travel);
  await expect(page.getByTestId("history-list")).toContainText(income);
});
