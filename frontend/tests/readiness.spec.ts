import { test, expect } from "@playwright/test";
test("build explains missing selected device before posting project", async ({
  page,
}) => {
  let posted = false;
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      json: {
        ready: true,
        common: { ready: true, reasons: [] },
        devices: [
          {
            target: "venu445mm",
            ready: false,
            reasons: ["缺少设备包 venu445mm"],
          },
        ],
      },
    }),
  );
  await page.route("**/api/builds", (route) => {
    posted = true;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "缺少设备包 venu445mm",
  );
  expect(posted).toBe(false);
});

