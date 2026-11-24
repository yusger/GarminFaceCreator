import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mergeLogs, diagnostic } from "../src/buildLogs";
test("log cursors append only deltas and reset explicitly on a restarted buffer", () => {
  let buffer = { id: "job", cursor: 0, lines: [] as string[] };
  buffer = mergeLogs(buffer, { lines: ["one", "two"], nextCursor: 2 });
  expect(mergeLogs(buffer, { lines: [], nextCursor: 2 }).lines).toEqual([
    "one",
    "two",
  ]);
  expect(mergeLogs(buffer, { lines: ["three"], nextCursor: 3 }).lines).toEqual([
    "one",
    "two",
    "three",
  ]);
  expect(
    mergeLogs(buffer, { lines: ["new"], nextCursor: 1, reset: true }).lines,
  ).toEqual(["new"]);
  expect(() => mergeLogs(buffer, { lines: ["bad"], nextCursor: 8 })).toThrow();
  expect(
    diagnostic("ERROR: venu445mm: /project/source/App.mc:12,4: error"),
  ).toEqual({ path: "source/App.mc", line: 12 });
});
test("large logs use cursor, reconnect same task and locate diagnostic without losing raw lines", async ({
  page,
}) => {
  const source = JSON.parse(
    readFileSync("frontend/public/templates/clownwatch.json", "utf8"),
  ).files.find((file: any) => file.path.startsWith("source/"));
  const after: number[] = [];
  let states = 0,
    posts = 0;
  await page.route("**/api/capabilities", (r) =>
    r.fulfill({
      json: { devices: [{ target: "venu445mm", ready: true, reasons: [] }] },
    }),
  );
  await page.route("**/api/builds", (r) => {
    posts++;
    return r.fulfill({ status: 202, json: { buildId: "log-test" } });
  });
  await page.route("**/api/builds/log-test", (r) => {
    states++;
    if (states >= 2 && states <= 4) return r.abort();
    return r.fulfill({
      json: { status: states === 1 ? "running" : "failed", artifacts: [] },
    });
  });
  await page.route("**/api/builds/log-test/logs?*", (r) => {
    const cursor = Number(new URL(r.request().url()).searchParams.get("after"));
    after.push(cursor);
    return r.fulfill({
      json:
        cursor === 0
          ? {
              lines: Array.from(
                { length: 2000 },
                (_, i) => "original log " + i,
              ),
              nextCursor: 2000,
              reset: false,
            }
          : {
              lines: [
                `ERROR: venu445mm: /project/${source.path}:2,1: test error`,
                `WARNING: diagnostic retained`,
              ],
              nextCursor: 2,
              reset: true,
            },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "original log 1999",
  );
  await expect(
    page.getByRole("button", { name: "继续观察原任务", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await page
    .getByRole("button", { name: "继续观察原任务", exact: true })
    .click();
  await expect(page.locator(".log-error")).toContainText("test error");
  await expect(page.locator(".log-warning")).toContainText(
    "diagnostic retained",
  );
  expect(posts).toBe(1);
  expect(after).toEqual([0, 2000]);
  await expect(page.locator(".build-drawer pre")).not.toContainText(
    "original log 1999",
  );
  await page
    .getByRole("button", { name: `打开 ${source.path}:2`, exact: true })
    .click();
  await expect(page.locator('.code-drawer [data-line="2"] mark')).toHaveCount(
    1,
  );
});
