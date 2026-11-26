import { test, expect } from "@playwright/test";
test("task credentials stay out of URLs and exported project storage", async ({ page }) => {
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  test.setTimeout(150000);
  await page.goto("/");
  await page.getByRole("button", { name: "使用 ClownWatch", exact: true }).click();
  const pending = page.waitForResponse(r => r.request().method() === "POST" && r.url().endsWith("/api/builds"));
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  const accepted = await pending;
  expect(accepted.status()).toBe(202);
  const job = await accepted.json();
  await expect(page.locator(".build-drawer pre")).toContainText("BUILD SUCCESSFUL", { timeout: 120000 });
  expect(await page.evaluate(({ id, token }) => sessionStorage.getItem("gfc-build-token-" + id) === token && !Object.values(localStorage).some(value => value.includes(token)), { id: job.buildId, token: job.accessToken })).toBe(true);
  const link = page.getByRole("link", { name: /^下载 .*\.prg$/ });
  expect(await link.getAttribute("href")).not.toContain(job.accessToken);
  for (const suffix of ["", "/logs", "/artifacts/watchface.prg"])
    expect((await page.request.get("/api/builds/" + job.buildId + suffix)).status()).toBe(404);
  expect((await page.request.post("/api/builds/" + job.buildId + "/cancel")).status()).toBe(404);
  const download = page.waitForEvent("download");
  await link.click(); expect(await (await download).failure()).toBeNull();
});
