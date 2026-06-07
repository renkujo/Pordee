import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";

export { expect, type Page };

export const test = base.extend<{ signedIn: void }>({
  signedIn: [
    async ({ page }, use) => {
      await signUpForTest(page);
      await use();
    },
    { auto: true },
  ],
});

const signUpForTest = async (page: Page) => {
  const id = randomUUID();

  await page.goto("/login?mode=signup");
  await expect(page.locator("#email")).toBeEditable();
  await page.locator("#name").fill(`E2E ${id.slice(0, 8)}`);
  await page.locator("#email").fill(`e2e-${id}@pordee.test`);
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: "สมัครและเข้าใช้งาน" }).click();
  await expect(page).toHaveURL(/\/$/);
};
