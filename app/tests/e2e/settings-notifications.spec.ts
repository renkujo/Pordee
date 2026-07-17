import { request as playwrightRequest } from "@playwright/test";
import { expect, test } from "./fixtures";

test("daily reminder settings persist a user-selected time", async ({
  page,
}) => {
  await page.goto("/settings?tab=notifications");

  await expect(
    page.getByRole("heading", { name: "เตือนให้บันทึกประจำวัน" })
  ).toBeVisible();
  const timeInput = page.getByLabel("เวลาเตือนประจำวัน");
  await expect(timeInput).toHaveValue("20:00");
  await expect(
    page.getByText(/ไม่รองรับ Web Push|production ยังตั้งค่าไม่ครบ/)
  ).toBeVisible();

  await timeInput.evaluate((input: HTMLInputElement) => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(input, "19:30");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(timeInput).toHaveValue("19:30");
  await page.getByRole("button", { name: "บันทึกเวลา" }).click();
  await expect(page.getByText("บันทึกเวลาเตือนแล้ว")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("เวลาเตือนประจำวัน")).toHaveValue("19:30");
});

test("push settings API rejects cross-origin, anonymous, and private targets", async ({
  page,
}) => {
  await page.goto("/settings?tab=notifications");
  const origin = new URL(page.url()).origin;

  const crossOrigin = await page.request.post("/api/push-subscriptions", {
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    data: {
      operation: "update-schedule",
      schedule: { localTime: "20:00", timeZone: "Asia/Bangkok" },
    },
  });
  expect(crossOrigin.status()).toBe(403);

  const privateTargetStatus = await page.evaluate(async () => {
    const response = await fetch("/api/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "test",
        endpoint: "https://127.0.0.1/push",
      }),
    });
    return response.status;
  });
  expect(privateTargetStatus).toBe(400);

  const anonymous = await playwrightRequest.newContext({ baseURL: origin });
  const anonymousResponse = await anonymous.post("/api/push-subscriptions", {
    headers: { "Content-Type": "application/json", Origin: origin },
    data: {
      operation: "update-schedule",
      schedule: { localTime: "20:00", timeZone: "Asia/Bangkok" },
    },
  });
  expect(anonymousResponse.status()).toBe(401);
  await anonymous.dispose();
});
