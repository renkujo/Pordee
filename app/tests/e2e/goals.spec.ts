import { expect, test } from "@playwright/test";

test("create goal shows it on goals and dashboard", async ({ page }) => {
  const unique = `เป้าหมาย-${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/goals");
  await page.waitForLoadState("networkidle");

  await page.locator("#goal-name").fill(unique);
  await page.locator("#goal-target").fill("5000");
  await page.getByRole("button", { name: "เพิ่มเป้าหมาย" }).click();

  await expect(page.getByTestId("goals-list")).toContainText(unique);
  await expect(page.getByTestId("goals-list")).toContainText("฿5,000");

  await page.goto("/");
  await expect(page.getByTestId("goal-list")).toContainText(unique);
});
