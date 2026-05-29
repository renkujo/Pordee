import { expect, test } from "@playwright/test";

test("edit transaction updates the row in history", async ({ page }) => {
  const unique = `แก้ทดสอบ-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  // Seed a row.
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${unique} 100`);
  await expect(page.locator("#amount")).toHaveValue("100");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Click the row.
  await page.getByRole("link", { name: new RegExp(unique) }).click();
  await expect(page).toHaveURL(/\/history\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "แก้ไขรายการ" })
  ).toBeVisible();

  // Change amount.
  await page.locator("#amount").fill("250");
  await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Updated value visible.
  const row = page.getByRole("link", { name: new RegExp(unique) });
  await expect(row).toContainText("250");
  await expect(row).not.toContainText("100\b");
});

test("delete transaction removes the row from history", async ({ page }) => {
  const unique = `ลบทดสอบ-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${unique} 77`);
  await expect(page.locator("#amount")).toHaveValue("77");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  const row = page.getByRole("link", { name: new RegExp(unique) });
  await expect(row).toBeVisible();
  await row.click();

  await expect(
    page.getByRole("heading", { name: "แก้ไขรายการ" })
  ).toBeVisible();
  await page.getByTestId("delete-button").click();
  await expect(page).toHaveURL(/\/history$/);

  await expect(
    page.getByRole("link", { name: new RegExp(unique) })
  ).toHaveCount(0);
});
