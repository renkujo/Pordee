import { expect, test } from "./fixtures";

test("settings language switch localizes the app shell and persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings?tab=language");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.getByRole("heading", { name: "ตั้งค่า" })).toBeVisible();

  await page.getByRole("button", { name: /English/ }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Home/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Add transaction/ })
  ).toBeVisible();

  await page.goto("/add");
  await expect(
    page.getByRole("heading", { name: "Add transaction" })
  ).toBeVisible();

  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "Transaction history" })
  ).toBeVisible();

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Transaction history" })
  ).toBeVisible();
});
