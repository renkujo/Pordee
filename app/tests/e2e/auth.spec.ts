import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("protected pages redirect to login until the user signs in", async ({
  page,
}) => {
  await page.goto("/settings");

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsettings$/);
  await expect(
    page.getByRole("heading", { name: "เข้าสู่พอดี" })
  ).toBeVisible();
});

test("user can sign up and sign out", async ({ page }) => {
  const id = randomUUID();

  await page.goto("/login?mode=signup");
  await page.locator("#name").fill(`E2E ${id.slice(0, 8)}`);
  await page.locator("#email").fill(`auth-${id}@pordee.test`);
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: "สมัครและเข้าใช้งาน" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("ภาพรวมเดือนนี้", { exact: true })).toBeVisible();

  await page.goto("/settings");
  await page
    .getByRole("main")
    .getByRole("button", { name: "ออกจากระบบ" })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2F$/);
});
