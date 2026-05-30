import { expect, test } from "./fixtures";

test("settings can create, rename, and delete an unused category", async ({
  page,
}) => {
  const unique = `หมวดทดสอบ-${Date.now()}`;
  const renamed = `${unique}-แก้แล้ว`;

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");

  await page.locator("#new-category-name").fill(unique);
  await page.getByRole("button", { name: "เพิ่มหมวด" }).click();

  await expect(page.getByLabel(`ชื่อหมวด ${unique}`)).toBeVisible();

  const updateForm = page
    .locator("form")
    .filter({ has: page.getByLabel(`ชื่อหมวด ${unique}`) });
  await updateForm.getByLabel(`ชื่อหมวด ${unique}`).fill(renamed);
  await updateForm.getByRole("button", { name: "บันทึก" }).click();

  await expect(page.getByLabel(`ชื่อหมวด ${renamed}`)).toBeVisible();

  const row = page
    .getByTestId("category-row")
    .filter({ has: page.getByLabel(`ชื่อหมวด ${renamed}`) });
  await row.getByRole("button", { name: "ลบ" }).click();
  await page.getByRole("button", { name: "ลบหมวด" }).click();

  await expect(page.getByLabel(`ชื่อหมวด ${renamed}`)).toHaveCount(0);
});
