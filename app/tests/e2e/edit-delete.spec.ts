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

test("history row actions dropdown can delete a transaction", async ({
  page,
}) => {
  const unique = `ลบเมนู-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${unique} 88`);
  await expect(page.locator("#amount")).toHaveValue("88");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  const row = page
    .getByTestId("history-list")
    .locator("li")
    .filter({
      has: page.getByRole("link", { name: new RegExp(unique) }),
    });
  await expect(row).toBeVisible();

  await row
    .getByRole("button", { name: new RegExp(`เปิดเมนู ${unique}`) })
    .click();
  await page
    .getByRole("menuitem", { name: new RegExp(`ลบ ${unique}`) })
    .click();
  await page.getByRole("button", { name: "ลบรายการ" }).click();

  await expect(
    page.getByRole("link", { name: new RegExp(unique) })
  ).toHaveCount(0);
});

test("history search filters transactions and can be cleared", async ({
  page,
}) => {
  const visible = `ค้นเจอ-${Date.now()}`;
  const hidden = `ค้นซ่อน-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  for (const title of [visible, hidden]) {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");
    await page.locator("#quick-entry").fill(`${title} 123`);
    await expect(page.locator("#amount")).toHaveValue("123");
    await page.getByRole("button", { name: "บันทึกรายการ" }).click();
    await expect(page).toHaveURL(/\/history$/);
  }

  const search = page.getByRole("searchbox", { name: "ค้นหารายการ" });
  await search.fill(visible);

  await expect(page.getByTestId("history-list")).toContainText(visible);
  await expect(
    page.getByRole("link", { name: new RegExp(hidden) })
  ).toHaveCount(0);

  await page.getByRole("button", { name: "ล้างคำค้นหา" }).click();
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("link", { name: new RegExp(visible) })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(hidden) })
  ).toBeVisible();
});
