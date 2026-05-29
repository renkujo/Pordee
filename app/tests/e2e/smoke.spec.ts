import { expect, test } from "@playwright/test";

test("home loads and shows the Pordee shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/พอดี/);
  await expect(page.getByText("ภาพรวมเดือนนี้", { exact: true })).toBeVisible();
});

test("desktop nav reaches /add, /history, /goals, /settings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await page.getByRole("link", { name: "บันทึก" }).first().click();
  await expect(page).toHaveURL(/\/add$/);
  await expect(
    page.getByRole("heading", { name: "บันทึกรายการ" })
  ).toBeVisible();

  await page.getByRole("link", { name: "ประวัติ" }).first().click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(
    page.getByRole("heading", { name: "ประวัติรายการ" })
  ).toBeVisible();

  await page.getByRole("link", { name: "เป้าหมาย" }).first().click();
  await expect(page).toHaveURL(/\/goals$/);

  await page.getByRole("link", { name: "ตั้งค่า" }).first().click();
  await expect(page).toHaveURL(/\/settings$/);
});
