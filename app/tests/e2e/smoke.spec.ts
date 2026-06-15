import { expect, test } from "./fixtures";

test("home loads and shows the Pordee shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/พอดี/);
  await expect(
    page.getByRole("region", { name: "ภาพรวมการเงิน" })
  ).toBeVisible();
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
  await expect(page).toHaveURL(/\/settings\?tab=account$/);
});

test("mobile bottom nav opens more drawer for secondary pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const bottomNav = page.getByRole("navigation", {
    name: "เมนูหลักบนมือถือ",
  });
  await expect(bottomNav).toBeVisible();
  await expect(page.getByRole("button", { name: "เพิ่มเติม" })).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "เป้าหมาย" })).toHaveCount(
    0
  );

  await page.getByRole("button", { name: "เพิ่มเติม" }).click();

  const moreNav = page.getByRole("navigation", { name: "เมนูเพิ่มเติม" });
  await expect(moreNav.getByRole("link", { name: /เป้าหมาย/ })).toBeVisible();
  await moreNav.getByRole("link", { name: /ตั้งค่า/ }).click();

  await expect(page).toHaveURL(/\/settings\?tab=account$/);
});
