import { expect, test } from "./fixtures";

test("settings can create, rename, and delete an unused category", async ({
  page,
}) => {
  const unique = `หมวดทดสอบ-${Date.now()}`;
  const renamed = `${unique}-แก้แล้ว`;

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "เพิ่มหมวด" }).click();
  const createDialog = page.getByTestId("create-category-dialog");
  await expect(createDialog).toBeVisible();
  const createForm = createDialog.locator("form");
  await createForm.locator("#new-category-name").fill(unique);
  await createForm.getByLabel("เลือกไอคอน บ้าน").check();
  await createForm.getByRole("button", { name: "เพิ่มหมวด" }).click();

  await expect(page.getByLabel(`ชื่อหมวด ${unique}`)).toBeVisible();

  const updateRow = page
    .getByTestId("category-row")
    .filter({ has: page.getByLabel(`ชื่อหมวด ${unique}`) });
  await updateRow.getByRole("button", { name: "แก้ไข" }).click();
  const editDialog = page.getByTestId("edit-category-dialog");
  await expect(editDialog).toBeVisible();
  const updateForm = editDialog.locator("form");
  await expect(updateForm.getByLabel("เลือกไอคอน บ้าน")).toBeChecked();
  await updateForm.getByLabel(`ชื่อหมวด ${unique}`).fill(renamed);
  await updateForm.getByLabel("เลือกไอคอน ช้อปปิ้ง").check();
  await updateForm.getByRole("button", { name: "บันทึกหมวด" }).click();

  await expect(page.getByLabel(`ชื่อหมวด ${renamed}`)).toBeVisible();
  const renamedRow = page
    .getByTestId("category-row")
    .filter({ has: page.getByLabel(`ชื่อหมวด ${renamed}`) });
  await renamedRow.getByRole("button", { name: "แก้ไข" }).click();
  const renamedForm = page.getByTestId("edit-category-dialog").locator("form");
  await expect(renamedForm.getByLabel("เลือกไอคอน ช้อปปิ้ง")).toBeChecked();
  await page.getByRole("button", { name: "ยกเลิก" }).click();

  const row = page
    .getByTestId("category-row")
    .filter({ has: page.getByLabel(`ชื่อหมวด ${renamed}`) });
  await row.getByRole("button", { name: "ลบ" }).click();
  await page.getByRole("button", { name: "ลบหมวด" }).click();

  await expect(page.getByLabel(`ชื่อหมวด ${renamed}`)).toHaveCount(0);
});
