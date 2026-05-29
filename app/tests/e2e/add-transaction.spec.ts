import { expect, test } from "@playwright/test";

test("quick-parse + submit lands on /history with the new row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/add");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", { name: "บันทึกรายการ" })
  ).toBeVisible();

  await page.locator("#quick-entry").fill("กาแฟ 65");

  await expect(page.locator("#amount")).toHaveValue("65");
  await expect(
    page.getByText("รายจ่าย", { exact: true }).first()
  ).toBeVisible();
  await expect(page.locator("#category")).toHaveValue("cat-food");

  await page.getByRole("button", { name: "บันทึกรายการ" }).click();

  await expect(page).toHaveURL(/\/history$/);
  const list = page.getByTestId("history-list");
  await expect(list).toBeVisible();
  await expect(list.getByText("กาแฟ")).toBeVisible();
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
  await expect(page.locator("#category")).toHaveValue("cat-food");

  await page.getByRole("button", { name: "รายรับ" }).click();

  const categoryOptions = await page
    .locator("#category option")
    .allTextContents();
  expect(categoryOptions).toContain("เงินเดือน");
  expect(categoryOptions).not.toContain("อาหาร");
});
