import { expect, test } from "./fixtures";

test("quick-parse + submit lands on /history with the new row", async ({
  page,
}) => {
  const unique = `กาแฟทดสอบ-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/add");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", { name: "บันทึกรายการ" })
  ).toBeVisible();

  await page.locator("#quick-entry").fill(`${unique} 65`);

  await expect(page.locator("#amount")).toHaveValue("65");
  await expect(
    page.getByText("รายจ่าย", { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "หมวด" })).toContainText(
    "อาหาร"
  );

  await page.getByRole("button", { name: "บันทึกรายการ" }).click();

  await expect(page).toHaveURL(/\/history$/);
  const list = page.getByTestId("history-list");
  await expect(list).toBeVisible();
  await expect(list.getByText(unique)).toBeVisible();
});

test("kind override flips to รายรับ and updates category options", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/add");
  await page.waitForLoadState("networkidle");

  const quick = page.locator("#quick-entry");
  await expect(quick).toBeEditable();
  await quick.fill("กาแฟ 65");
  await expect(page.locator("#amount")).toHaveValue("65");
  const category = page.getByRole("combobox", { name: "หมวด" });
  await expect(category).toContainText("อาหาร");

  await page.getByRole("button", { name: "รายรับ" }).click();

  await expect(category).toContainText("— ไม่ระบุ —");
  await category.click();
  await expect(page.getByRole("option", { name: "เงินเดือน" })).toBeVisible();
  await expect(page.getByRole("option", { name: "อาหาร" })).toHaveCount(0);
});

test("occurred date picker supports past presets", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/add");
  await page.waitForLoadState("networkidle");

  const occurredAt = page.locator("#occurredAt");
  await occurredAt.click();
  await page.getByRole("button", { name: "เมื่อวาน" }).click();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const expected = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, "0"),
    String(yesterday.getDate()).padStart(2, "0"),
  ].join("-");

  await expect(page.locator('input[name="occurredAt"]')).toHaveValue(expected);
});

test("discount field records the net expense amount", async ({ page }) => {
  const unique = `บิลทดสอบ-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/add");
  await page.waitForLoadState("networkidle");

  await page.locator("#quick-entry").fill(`${unique} 100`);
  await page.locator("#discountAmount").fill("15");

  await expect(page.getByText("ยอดสุทธิ 85 บาท")).toBeVisible();

  await page.getByRole("button", { name: "บันทึกรายการ" }).click();

  await expect(page).toHaveURL(/\/history$/);
  const list = page.getByTestId("history-list");
  const row = list.locator("li").filter({ hasText: unique });
  await expect(row).toBeVisible();
  await expect(row.getByText("-฿85")).toBeVisible();
});

test("history list keeps decimal transaction amounts", async ({ page }) => {
  const unique = `ทศนิยมทดสอบ-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/add");
  await page.waitForLoadState("networkidle");

  await page.locator("#quick-entry").fill(`${unique} 65.75`);

  await expect(page.locator("#amount")).toHaveValue("65.75");

  await page.getByRole("button", { name: "บันทึกรายการ" }).click();

  await expect(page).toHaveURL(/\/history$/);
  const list = page.getByTestId("history-list");
  const row = list.locator("li").filter({ hasText: unique });
  await expect(row).toBeVisible();
  await expect(row.getByText("-฿65.75")).toBeVisible();
});
