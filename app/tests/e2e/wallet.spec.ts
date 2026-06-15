import { expect, test } from "./fixtures";

test("wallet shows empty guidance and the four pockets for a new user", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/wallet");
  await page.waitForLoadState("networkidle");

  // Fresh user has no data: available is zero and the starter CTA shows.
  await expect(page.getByTestId("available")).toContainText("฿0");
  await expect(page.getByText("เริ่มจากรายการแรกก่อน")).toBeVisible();

  // The four computed pockets always render.
  await expect(
    page.getByRole("heading", { name: "ใช้จ่ายประจำวัน" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "เดินทาง" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "เตรียมจ่ายบิล" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "เงินสำรอง" })).toBeVisible();

  // No data yet means no spend breakdown / advice sections.
  await expect(page.getByText("เงินหายไปไหน")).toHaveCount(0);
});

test("wallet reflects computed available money after seeding data", async ({
  page,
}) => {
  const stamp = Date.now();
  const incomeTitle = `เงินเดือนกระเป๋า-${stamp}`;
  const expenseTitle = `ค่าใช้จ่ายกระเป๋า-${stamp}`;
  await page.setViewportSize({ width: 1280, height: 800 });

  // Seed an income via the /add flow.
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${incomeTitle} 30000`);
  await expect(page.locator("#amount")).toHaveValue("30000");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Seed an expense via the /add flow.
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
  await page.locator("#quick-entry").fill(`${expenseTitle} 1200`);
  await expect(page.locator("#amount")).toHaveValue("1200");
  await page.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page).toHaveURL(/\/history$/);

  // Wallet should now show non-zero available and the spend breakdown only.
  await page.goto("/wallet");
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("available")).not.toContainText("฿0");
  await expect(page.getByText("เริ่มจากรายการแรกก่อน")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "เงินหายไปไหน" })
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", {
      name: "สัดส่วนไม่ระบุหมวด 100% ของรายจ่ายเดือนนี้",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "คำแนะนำจากพอดี" })
  ).toHaveCount(0);
});

test("wallet can create a custom pocket and record a transfer", async ({
  page,
}) => {
  const stamp = Date.now();
  const pocketName = `เงินเที่ยว-${stamp}`;
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/wallet");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "เพิ่มกระเป๋า" }).click();
  await page.getByPlaceholder("เช่น ค่าอาหาร หรือ เงินเที่ยว").fill(pocketName);
  await page.locator('input[name="monthlyLimit"]').fill("4500");
  await page.getByRole("button", { name: "บันทึกกระเป๋า" }).click();

  await expect(page.getByRole("heading", { name: pocketName })).toBeVisible();

  await page.getByRole("button", { name: "ย้ายเงิน" }).first().click();
  await page.locator('input[name="amount"]').fill("500");
  await page.locator('input[name="note"]').fill(`เติมกระเป๋าทดสอบ-${stamp}`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ย้ายเงิน" })
    .click();

  await expect(page.getByText(`เติมกระเป๋าทดสอบ-${stamp}`)).toBeVisible();
});

test("wallet can reorder pockets with drag and drop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/wallet");
  await page.waitForLoadState("networkidle");

  const pocketGrid = page.getByLabel("รายการกระเป๋าย่อย");
  const pocketCards = pocketGrid.getByTestId("wallet-pocket-card");
  await expect(pocketCards.first()).toContainText("ใช้จ่ายประจำวัน");
  await pocketGrid.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await pocketCards.nth(1).dragTo(pocketCards.first());
  await expect(pocketCards.first()).toContainText("เดินทาง");
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(scrollAfter).toBeGreaterThan(0);

  await page.reload();
  await expect(pocketCards.first()).toContainText("เดินทาง");
});
