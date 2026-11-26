import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { insertWidget } from "../src/widgets";
import { circleLayout, distributeLayers } from "../src/arrange";
import { layerBox } from "../src/selection";
const opts = {
  cx: 227,
  cy: 227,
  radius: 80,
  start: 0,
  sweep: 360,
  count: 4,
  rotate: false,
};
test("distribution uses rotated bounds and excludes locked nodes", () => {
  const layers = [
    { ...layer("rect"), x: 80, y: 160, w: 20, h: 20 },
    { ...layer("rect"), x: 130, y: 170, w: 30, h: 20, rotation: 30 },
    { ...layer("rect"), x: 300, y: 160, w: 20, h: 20 },
    { ...layer("rect"), x: 150, locked: true },
  ];
  const next = distributeLayers(
    layers,
    layers.map((l) => l.id),
    "x",
  );
  const [a, b, c] = next.slice(0, 3).map(layerBox);
  expect(b.x - a.x - a.w).toBeCloseTo(c.x - b.x - b.w, 5);
  expect(next[3]).toEqual(layers[3]);
  expect(next[0].x).toBe(80);
  expect(next[2].x).toBe(300);
});
test("circle copies preserve composite identity and partial sweeps include endpoints", () => {
  const p = insertWidget(project("Ring", true), "capsule-metric");
  p.layers[0].w = 100;
  p.layers[0].h = 30;
  const result = circleLayout(p, [p.layers[0].id], opts, true);
  validateProject(result);
  expect(result.layers).toHaveLength(4);
  expect(
    new Set(result.layers.flatMap((l) => l.compound!.layers.map((c) => c.id)))
      .size,
  ).toBe(20);
  expect(result.layers[0].y + 15).toBe(147);
  expect(result.layers[1].x + 50).toBe(307);
  expect(p.layers).toHaveLength(1);
  expect(() =>
    circleLayout(p, [p.layers[0].id], { ...opts, rotate: true }, true),
  ).toThrow(/旋转/);
  const arc = circleLayout(
    p,
    [p.layers[0].id],
    { ...opts, sweep: 180, count: 3 },
    true,
  );
  expect(arc.layers.at(-1)!.y + 15).toBeCloseTo(307, 4);
});
test("circle UI creates twelve editable objects and undo restores original", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Circle"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "圆形", exact: true }).click();
  await page.getByText("排列工具", { exact: true }).click();
  await page.getByLabel("圆周半径").fill("70");
  await page.getByRole("button", { name: "圆周复制", exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(12);
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await page.getByTitle("重做", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(12);
});
