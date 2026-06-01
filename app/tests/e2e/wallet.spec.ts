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

  // Wallet should now show non-zero available and the data-driven sections.
  await page.goto("/wallet");
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("available")).not.toContainText("฿0");
  await expect(page.getByText("เริ่มจากรายการแรกก่อน")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "เงินหายไปไหน" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "คำแนะนำจากพอดี" })
  ).toBeVisible();
});
