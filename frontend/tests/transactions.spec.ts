import { test, expect, type Page } from "@playwright/test";
async function setup(page: Page) {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("事务测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "矩形", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
}
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
async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve) => {
        const r = indexedDB.open("garmin-face-creator", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("projects"),
            read = tx.objectStore("projects").getAll();
          tx.oncomplete = () => {
            db.close();
            resolve(read.result[0]);
          };
        };
      }),
  );
}
test("drag commits final pointer position once, does not autosave mid-drag, and cancel rolls back", async ({
  page,
}) => {
  await setup(page);
  const baseline = await stored(page);
  const start = await point(page, 210, 205),
    finish = await point(page, 240, 225);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x, finish.y, { steps: 2 });
  await page.waitForTimeout(600);
  expect((await stored(page)).revision).toBe(baseline.revision);
  await page.mouse.up();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("170");
  await expect(page.getByLabel("Y", { exact: true })).toHaveValue("200");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("140");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x, finish.y);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("140");
  // Zero movement leaves redo intact and adds no history entry.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "重做", exact: true }),
  ).toBeEnabled();
});
test("all resize corners anchor the opposite corner and property typing is a single undo", async ({
  page,
}) => {
  await setup(page);
  for (const [corner, x, y, dx, dy, expectedX, expectedY] of [
    ["左上缩放", 140, 180, -10, -10, 130, 170],
    ["右上缩放", 290, 180, 10, -10, 140, 170],
    ["左下缩放", 140, 230, -10, 10, 130, 180],
    ["右下缩放", 290, 230, 10, 10, 140, 180],
  ] as const) {
    const a = await point(page, x, y),
      b = await point(page, x + dx, y + dy);
    await expect(page.getByLabel(corner, { exact: true })).toBeVisible();
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y);
    await page.mouse.up();
    await expect(page.getByLabel("宽度", { exact: true })).toHaveValue("160");
    await expect(page.getByLabel("高度", { exact: true })).toHaveValue("60");
    await expect(page.getByLabel("X", { exact: true })).toHaveValue(
      String(expectedX),
    );
    await expect(page.getByLabel("Y", { exact: true })).toHaveValue(
      String(expectedY),
    );
    await page.getByRole("button", { name: "撤销", exact: true }).click();
  }
  const field = page.getByLabel("图层名称");
  await field.fill("");
  await field.pressSequentially("abcdefgh");
  await field.blur();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(field).toHaveValue("矩形");
  await page.getByRole("button", { name: "删除图层", exact: true }).click();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  // No dangling selection survives deletion/history changes.
  await expect(page.locator(".inspector")).toBeVisible();
});
