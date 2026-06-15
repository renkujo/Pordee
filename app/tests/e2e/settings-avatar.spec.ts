import { expect, test } from "./fixtures";

test("settings can save and reset a preset profile avatar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings?tab=account");
  await page.waitForLoadState("networkidle");

  const shellAvatar = page.getByTestId("account-avatar").first().locator("img");
  const initialSrc = (await shellAvatar.getAttribute("src")) ?? "";
  const initialIndex = parseAvatarIndex(initialSrc);
  const targetIndex = initialIndex === 12 ? 1 : initialIndex + 1;
  const targetSrcFragment = `pordee-human-avatar-direct-${String(
    targetIndex
  ).padStart(2, "0")}.png`;

  await page.getByRole("button", { name: "แก้ไขโปรไฟล์" }).click();
  await page
    .getByRole("radio", {
      exact: true,
      name: `เลือกรูปโปรไฟล์ preset ${targetIndex}`,
    })
    .check();
  await page.getByRole("button", { name: "บันทึกโปรไฟล์" }).click();

  await expect(shellAvatar).toHaveAttribute(
    "src",
    new RegExp(targetSrcFragment)
  );

  await page.getByRole("button", { name: "แก้ไขโปรไฟล์" }).click();
  await page.getByRole("button", { name: "กลับไปใช้รูปอัตโนมัติ" }).click();
  await page.getByRole("button", { name: "บันทึกโปรไฟล์" }).click();

  await expect(shellAvatar).toHaveAttribute("src", initialSrc);
});

test("settings can update the profile display name", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/settings?tab=account");
  await page.waitForLoadState("networkidle");

  const nextName = `LewisX ${Date.now()}`;

  await page.getByRole("button", { name: "แก้ไขโปรไฟล์" }).click();
  await page.getByLabel("ชื่อที่แสดง").fill(nextName);
  await page.getByRole("button", { name: "บันทึกโปรไฟล์" }).click();

  await expect(page.getByText(nextName)).toBeVisible();
});

test("settings rejects a tampered avatar preset id", async ({ page }) => {
  await page.goto("/settings?tab=account");
  await page.waitForLoadState("networkidle");

  const response = await page.request.post("/settings?tab=account", {
    form: {
      intent: "updateAvatarPreset",
      avatarPresetId: "not-a-pordee-preset",
    },
  });

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(
    "รูปโปรไฟล์นี้ไม่อยู่ในชุด preset ของพอดี"
  );
});

const parseAvatarIndex = (src: string) => {
  const match = src.match(/pordee-human-avatar-direct-(\d+)\.png/);
  return match ? Number(match[1]) : 1;
};
