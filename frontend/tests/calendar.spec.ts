import { test, expect } from "@playwright/test";
import {
  calendarGrid,
  shiftCalendarDate,
  calendarDateLabel,
} from "../src/calendar";
import { project, layer, validateProject } from "../src/domain";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
test("three-week grid covers start days, leap centuries, month/year transitions without timezone arithmetic", () => {
  for (const key of [
    "1900-03-01",
    "2000-03-01",
    "2028-03-01",
    "2100-03-01",
    "2026-01-01",
    "2026-12-31",
    "2026-11-23",
  ]) {
    for (const start of ["monday", "sunday"] as const) {
      const grid = calendarGrid(key, start);
      expect(grid.cells).toHaveLength(21);
      expect(new Set(grid.cells.map((c) => c.key)).size).toBe(21);
      expect(grid.cells.filter((c) => c.today).map((c) => c.key)).toEqual([
        key,
      ]);
      expect(grid.headers[0]).toBe(start === "monday" ? "Mo" : "Su");
      expect(new Date(grid.cells[0].key + "T12:00:00Z").getUTCDay()).toBe(
        start === "monday" ? 1 : 0,
      );
      for (let i = 1; i < 21; i++)
        expect(shiftCalendarDate(grid.cells[i - 1].key, 1)).toBe(
          grid.cells[i].key,
        );
    }
  }
  for (const [year, has29] of [
    [1900, false],
    [2000, true],
    [2028, true],
    [2100, false],
  ] as const)
    expect(
      calendarGrid(`${year}-03-01`).cells.some(
        (c) => c.key === `${year}-02-29`,
      ),
    ).toBe(has29);
  expect(shiftCalendarDate("2026-12-31", 1)).toBe("2027-01-01");
  expect(shiftCalendarDate("2028-03-01", -1)).toBe("2028-02-29");
  expect(calendarDateLabel("2028-03-01")).toBe("WED 1");
  expect(() => calendarGrid("2027-02-29")).toThrow(/日期/);
});
test("calendar protocol and native generation retain live local dates, day cache and validated theme", () => {
  const p = project("Calendar", true);
  p.layers = [layer("calendar")];
  expect(generationLayer(p.layers[0]).calendarStart).toBe("monday");
  expect(generationLayer(p.layers[0]).calendarTodayColor).toBe("#70c7ff");
  expect(() =>
    validateProject({
      ...p,
      layers: [{ ...p.layers[0], calendarStart: "bad" }],
    }),
  ).toThrow(/周起始日/);
  expect(() =>
    validateProject({
      ...p,
      layers: [{ ...p.layers[0], calendarTodayColor: "url(secret)" }],
    }),
  ).toThrow(/颜色/);
  const code = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(code).toContain("Gregorian.info(Time.now(),Time.FORMAT_SHORT)");
  expect(code).toContain("calendarStamp");
  expect(code).toContain("year%400==0");
  expect(code).not.toContain("2026-11-23");
  expect(code).not.toContain("Timer");
});
test("calendar preview changes date without mutating design and settings persist", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Calendar"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "三周日历", exact: true }).click();
  await page.getByLabel("周起始日", { exact: true }).selectOption("sunday");
  await page.getByLabel("今日背景", { exact: true }).fill("#ff8800");
  await page.getByLabel("今日背景", { exact: true }).blur();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const revision = await page.locator(".right-status").textContent();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await dialog.getByLabel("预览日期", { exact: true }).fill("2028-03-01");
  await expect(dialog.locator('[data-calendar-date="2028-03-01"]')).toHaveCount(
    1,
  );
  await expect(
    dialog.locator('[data-calendar-cell="2028-02-29"] text'),
  ).toHaveText("29");
  await expect(
    dialog.locator(
      '[data-calendar-cell="2028-03-01"][data-today="true"] circle',
    ),
  ).toHaveAttribute("fill", "#ff8800");
  await dialog.getByRole("button", { name: "关闭预览", exact: true }).click();
  expect(await page.locator(".right-status").textContent()).toBe(revision);
  await page.reload();
  await page
    .getByRole("button", { name: "打开 Calendar", exact: true })
    .click();
  await page.locator(".layer-row").first().click();
  await expect(page.getByLabel("周起始日", { exact: true })).toHaveValue(
    "sunday",
  );
});
