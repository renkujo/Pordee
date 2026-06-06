import { expect, test } from "@playwright/test";

test("explicit light theme stays light when the device prefers dark", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    window.localStorage.setItem("pordee-theme", "light");
  });

  await page.goto("/login");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "light"
  );

  const theme = await page.evaluate(() => {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);

    return {
      colorScheme: rootStyle.colorScheme,
      sky: rootStyle.getPropertyValue("--color-sky").trim(),
      surface: rootStyle.getPropertyValue("--color-surface").trim(),
      ink: rootStyle.getPropertyValue("--color-ink").trim(),
      bodyBackground: bodyStyle.backgroundColor,
      bodyColor: bodyStyle.color,
    };
  });

  expect(theme).toEqual({
    colorScheme: "light",
    sky: "#eaf7ff",
    surface: "#ffffff",
    ink: "#172026",
    bodyBackground: "rgb(234, 247, 255)",
    bodyColor: "rgb(23, 32, 38)",
  });
});
