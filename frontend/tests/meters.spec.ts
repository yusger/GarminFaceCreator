import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { meterPolygons, meterLit } from "../src/meters";
import { generationLayer } from "../src/generationDto";
import { generationRequirements } from "../src/generationRequirements";
import { localGenerate } from "../src/localGenerator";
test("meter geometry stays in bounds and mirrored arcs preserve bottom-first segment order", () => {
  const base = { ...layer("meter"), w: 88, h: 320, meterCount: 20 };
  const left = meterPolygons({ ...base, meterShape: "left" }),
    right = meterPolygons({ ...base, meterShape: "right" });
  expect(left).toHaveLength(20);
  for (let i = 0; i < 20; i++)
    for (let j = 0; j < left[i].length; j++) {
      const [x, y] = left[i][j];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(88);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(320);
      expect(right[i][j][0]).toBeCloseTo(88 - x);
      expect(right[i][j][1]).toBe(y);
    }
  expect(left[0][0][1]).toBeGreaterThan(left.at(-1)![0][1]);
  const bar = meterPolygons(layer("meter"));
  expect(bar[0][0][0]).toBeLessThan(bar[1][0][0]);
});
test("meter progress handles boundaries, invalid data and fixed goals without automatic goal claims", () => {
  const l = { ...layer("meter"), meterCount: 20, meterGoal: 10000 };
  for (const [value, count] of [
    [0, 0],
    [499, 0],
    [500, 1],
    [4500, 9],
    [10000, 20],
    [20000, 20],
  ])
    expect(meterLit(l, value)).toBe(count);
  for (const value of [null, undefined, NaN, Infinity, -1])
    expect(meterLit(l, value)).toBe(0);
  expect(meterLit(l, 10000, true)).toBe(0);
  expect(meterLit({ ...l, source: "battery", meterGoal: 100 }, 101)).toBe(0);
  expect(meterLit({ ...l, source: "battery", meterGoal: 100 }, 78)).toBe(15);
  const p = project("Meters", true);
  p.layers = [l];
  const dto = generationLayer(l);
  expect(dto.meterPolygons).toEqual(meterPolygons(l));
  expect(dto.meterGoal).toBe(10000);
  expect(generationRequirements(p).dataSources.map((a) => a.source)).toEqual([
    "steps",
  ]);
  for (const changes of [
    { meterGoal: 0 },
    { meterGoal: 0.00001 },
    { meterCount: 3 },
    { meterDim: 2 },
    { source: "heartRate" },
    { meterShape: "bad" },
  ])
    expect(() =>
      validateProject({ ...p, layers: [{ ...l, ...changes }] }),
    ).toThrow(/仪表/);
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source).toContain("ActivityMonitor.getInfo()");
  expect(source).not.toContain("stepGoal");
  expect(source).not.toContain("Timer");
});
test("meter controls change preview, persist and invalidate generated code after goal edit", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Meters"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "目标仪表", exact: true }).click();
  await page.getByLabel("仪表样式", { exact: true }).selectOption("left");
  await page.getByLabel("仪表数据", { exact: true }).selectOption("battery");
  await page.getByLabel("分段数量", { exact: true }).fill("20");
  await expect(
    page.locator("svg.watch polygon[data-meter-segment]"),
  ).toHaveCount(20);
  await expect(
    page.locator('svg.watch polygon[data-lit="true"]').first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByLabel("目标数值", { exact: true }).fill("200");
  await page.getByLabel("目标数值", { exact: true }).blur();
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 Meters", exact: true }).click();
  await page.locator(".layer-row").first().click();
  await expect(page.getByLabel("仪表样式", { exact: true })).toHaveValue(
    "left",
  );
  await expect(page.getByLabel("目标数值", { exact: true })).toHaveValue("200");
});
