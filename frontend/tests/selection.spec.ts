import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function point(page: Page, x: number, y: number) {
  return page.locator("svg.watch").evaluate(
    (svg, [x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(
        (svg as SVGSVGElement).getScreenCTM()!,
      );
      return { x: p.x, y: p.y };
    },
    [x, y],
  );
}
async function exported(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  return JSON.parse(await readFile((await (await event).path())!, "utf8"));
}
async function selectPair(page: Page) {
  await page.locator(".layer-row").filter({ hasText: "矩形A" }).click();
  await page
    .locator(".layer-row")
    .filter({ hasText: "矩形B" })
    .click({ modifiers: ["Shift"] });
}
test("multi selection moves as one, snaps group center and respects lock in batch operations", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("多选测试"));
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  for (const [name, x, y] of [
    ["矩形A", 100, 100],
    ["矩形B", 180, 140],
  ] as const) {
    await page.getByRole("button", { name: "矩形", exact: true }).click();
    await page.getByLabel("图层名称", { exact: true }).fill(name);
    await page.getByLabel("X", { exact: true }).fill(String(x));
    await page.getByLabel("Y", { exact: true }).fill(String(y));
    await page.getByLabel("宽度", { exact: true }).fill("40");
    await page.getByLabel("高度", { exact: true }).fill("40");
    await page.getByLabel("高度", { exact: true }).blur();
  }
  await selectPair(page);
  await expect(page.getByLabel("已选图层数", { exact: true })).toContainText(
    "2",
  );
  const a = await point(page, 200, 160),
    b = await point(page, 266, 160);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
  let p = await exported(page);
  expect(p.layers.map((l: any) => l.x)).toEqual([167, 247]);
  expect(p.layers.map((l: any) => l.y)).toEqual([100, 140]);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  p = await exported(page);
  expect(p.layers.map((l: any) => l.x)).toEqual([100, 180]);
  // Blank-canvas marquee selects both rectangles without recording a design mutation.
  const start = await point(page, 90, 90),
    finish = await point(page, 230, 190);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x, finish.y);
  await page.mouse.up();
  await expect(page.getByLabel("已选图层数", { exact: true })).toContainText(
    "2",
  );
  await page.getByRole("button", { name: "左对齐", exact: true }).click();
  p = await exported(page);
  expect(p.layers.map((l: any) => l.x)).toEqual([100, 100]);
  expect(p.layers.map((l: any) => l.y)).toEqual([100, 140]);
  await page
    .getByRole("button", { name: "批量锁定/解锁", exact: true })
    .click();
  await page.getByRole("button", { name: "删除图层", exact: true }).click();
  expect((await exported(page)).layers).toHaveLength(2);
  await page
    .getByRole("button", { name: "批量锁定/解锁", exact: true })
    .click();
  await page.getByRole("button", { name: "复制图层", exact: true }).click();
  expect((await exported(page)).layers).toHaveLength(4);
  await page.getByRole("button", { name: "删除图层", exact: true }).click();
  expect((await exported(page)).layers).toHaveLength(2);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  expect((await exported(page)).layers).toHaveLength(4);
});
