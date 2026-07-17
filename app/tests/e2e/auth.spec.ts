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

test("forgot-password flow keeps account existence private", async ({
  page,
}) => {
  const email = `missing-${randomUUID()}@pordee.test`;

  await page.goto("/login");
  await page.getByRole("link", { name: "ลืมรหัสผ่าน?" }).click();

  await expect(
    page.getByRole("heading", { name: "ลืมรหัสผ่าน" })
  ).toBeVisible();
  await page.getByLabel("อีเมล").fill(email);
  await page.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่าน" }).click();

  await expect(page.getByText("ตรวจอีเมลของคุณ")).toBeVisible();
  await expect(page.getByText(/หากอีเมลนี้มีบัญชีอยู่/)).toBeVisible();
});

test("expired password-reset links show a safe recovery message", async ({
  page,
}) => {
  await page.goto("/reset-password?error=INVALID_TOKEN");

  await expect(
    page.getByRole("heading", { name: "ตั้งรหัสผ่านใหม่" })
  ).toBeVisible();
  await expect(
    page.getByText(/ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว/)
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "กลับไปเข้าสู่ระบบ" })
  ).toBeVisible();
});

test("user can sign up and sign out", async ({ page }) => {
  const id = randomUUID();

  await page.goto("/login?mode=signup");
  await page.locator("#name").fill(`E2E ${id.slice(0, 8)}`);
  await page.locator("#email").fill(`auth-${id}@pordee.test`);
  await page.locator("#password").fill("Password1@");
  await page.locator("#confirm-password").fill("Password1@");
  await page.getByRole("button", { name: "สมัครและเข้าใช้งาน" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.goto("/settings?tab=account");
  await page
    .getByRole("main")
    .getByRole("button", { name: "ออกจากระบบ" })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2F$/);
});

test("user can sign out from the mobile account menu", async ({ page }) => {
  const id = randomUUID();

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/login?mode=signup");
  await page.locator("#name").fill(`Mobile E2E ${id.slice(0, 8)}`);
  await page.locator("#email").fill(`mobile-logout-${id}@pordee.test`);
  await page.locator("#password").fill("Password1@");
  await page.locator("#confirm-password").fill("Password1@");
  await page.getByRole("button", { name: "สมัครและเข้าใช้งาน" }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "เปิดเมนูบัญชี" }).click();
  await page.getByRole("menuitem", { name: "ออกจากระบบ" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2F$/);
});

test("user can change password from security settings", async ({ page }) => {
  const id = randomUUID();
  const email = `change-password-${id}@pordee.test`;
  const oldPassword = "Start123@";
  const newPassword = "Password1@";

  await page.goto("/login?mode=signup");
  await page.locator("#name").fill(`E2E ${id.slice(0, 8)}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(oldPassword);
  await page.locator("#confirm-password").fill(oldPassword);
  await page.getByRole("button", { name: "สมัครและเข้าใช้งาน" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.goto("/settings?tab=security");
  await page.getByLabel("รหัสผ่านปัจจุบัน").fill("wrong-password");
  await page.getByLabel("รหัสผ่านใหม่", { exact: true }).fill(newPassword);
  await page
    .getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true })
    .fill(newPassword);
  await page.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" }).click();

  await expect(page.getByText("รหัสผ่านปัจจุบันไม่ถูกต้อง")).toBeVisible();

  await page.getByLabel("รหัสผ่านปัจจุบัน").fill(oldPassword);
  await page.getByLabel("รหัสผ่านใหม่", { exact: true }).fill(newPassword);
  await page
    .getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true })
    .fill(newPassword);
  await page.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" }).click();

  await expect(page.getByText("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว")).toBeVisible();

  await page.goto("/settings?tab=account");
  await page
    .getByRole("main")
    .getByRole("button", { name: "ออกจากระบบ" })
    .click();

  await expect(page).toHaveURL(/\/login$/);

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(newPassword);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
});
