import { test, expect } from "@playwright/test";
import { arcBands, arcCaps, ringProgress } from "../src/arc";
import { project, layer, validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { applyChat } from "../src/designChat";
test("continuous arc shares bounded progress, missing, goal and AOD semantics", () => {
  const l = {
    ...layer("ring"),
    ringStyle: "continuous" as const,
    ringCap: "round" as const,
    ringSource: "battery" as const,
  };
  expect(ringProgress(l, 0)).toBe(0);
  expect(ringProgress(l, 50)).toBe(0.5);
  expect(ringProgress(l, 100)).toBe(1);
  for (const n of [-1, 101, NaN, Infinity, null])
    expect(ringProgress(l, n)).toBe(0);
  expect(ringProgress(l, 50, true)).toBe(0);
  expect(ringProgress(l, 50, false, true)).toBe(0);
  expect(
    ringProgress({ ...l, ringSource: "steps", ringGoal: 1000 }, 2000),
  ).toBe(1);
  expect(ringProgress({ ...l, ringSource: "heartRate" }, 0)).toBe(0);
  expect(arcBands(200, 200, 0, 0, 10)).toHaveLength(0);
  expect(arcBands(200, 200, 0, 360, 10)).toHaveLength(120);
  expect(arcBands(200, 200, 180, 0, 10)).toHaveLength(60);
  expect(arcBands(200, 200, 0, 90, 10)[0][0]).toEqual([100, 0]);
  expect(arcCaps(200, 200, 0, 90, 10)[0]).toEqual({ x: 100, y: 5, r: 5 });
  const p = project("Arc", true);
  p.layers = [l];
  validateProject(p);
  expect(
    localGenerate(p).find((f) => f.path === "source/App.mc")!.content,
  ).toContain("drawProgressArc(dc");
  const next = applyChat(
    p,
    JSON.stringify({
      message: "ok",
      operations: [
        {
          type: "update",
          id: l.id,
          patch: { ringStyle: "ticks", ringCap: "butt" },
        },
      ],
    }),
  ).project;
  expect(next.layers[0].ringStyle).toBe("ticks");
  expect(p.layers[0].ringStyle).toBe("continuous");
  expect(() =>
    validateProject({ ...p, layers: [{ ...l, ringStyle: "script" as any }] }),
  ).toThrow(/圆环样式/);
});
test("continuous arc controls render a smooth band and retain tick compatibility", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("ArcUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "圆环", exact: true }).click();
  await page.getByLabel("圆环样式").selectOption("continuous");
  await page.getByLabel("圆弧端点").selectOption("round");
  await expect(page.locator("[data-progress-arc]")).toHaveCount(1);
  expect(
    await page.locator("[data-progress-arc] polygon").count(),
  ).toBeGreaterThan(100);
  await page.getByLabel("圆环样式").selectOption("ticks");
  await expect(page.locator("[data-progress-arc]")).toHaveCount(0);
  await expect(page.locator("[data-layer] > line")).toHaveCount(60);
});
