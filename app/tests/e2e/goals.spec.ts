import { expect, test } from "./fixtures";

test("create goal shows it on goals and dashboard", async ({ page }) => {
  const unique = `เป้าหมาย-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/goals");
  await page.waitForLoadState("networkidle");

  await page.locator("#goal-name").fill(unique);
  await page.locator("#goal-target").fill("5000");
  await page.getByRole("button", { name: "เพิ่มเป้าหมาย" }).click();

  const goalItem = page
    .getByTestId("goals-list")
    .locator("li")
    .filter({ hasText: unique });

  await expect(goalItem).toContainText(unique);
  await expect(page.getByTestId("goals-list")).toContainText("฿5,000");

  await goalItem.getByLabel("เติมเงินเข้าเป้า").fill("1250");
  await goalItem.getByRole("button", { name: "บันทึกเงินเข้าเป้า" }).click();
  await expect(goalItem).toContainText("฿1,250");

  await page.goto("/");
  await expect(page.getByTestId("goal-list")).toContainText(unique);
});
