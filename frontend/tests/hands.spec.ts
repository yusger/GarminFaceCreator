import { crossesScreen } from "../src/bounds";
import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { handPoints } from "../src/hands";
import { localGenerate } from "../src/localGenerator";
import { generationLayer } from "../src/generationDto";
test("hand geometry binds local clock continuously, keeps offset pivots bounded and never invents invalid time", () => {
  const l = { ...layer("hand"), x: 0, y: 0, w: 400, h: 400 };
  expect(crossesScreen(l)).toBe(false);
  expect(crossesScreen({ ...l, x: 250 })).toBe(true);
  expect(crossesScreen({ ...l, x: 250, allowClip: true })).toBe(false);
  const top = handPoints(l, "00:00", 0)!;
  expect(top.x2).toBeCloseTo(200);
  expect(top.y2).toBeLessThan(200);
  const right = handPoints(l, "03:00", 0)!;
  expect(right.y2).toBeCloseTo(200);
  expect(right.x2).toBeGreaterThan(200);
  expect(handPoints(l, "03:30", 0)!.y2).toBeGreaterThan(200);
  expect(handPoints(l, "03:30", 30)!.y2).toBeGreaterThan(
    handPoints(l, "03:30", 0)!.y2,
  );
  expect(
    handPoints({ ...l, handType: "minute" }, "03:15", 30)!.y2,
  ).toBeGreaterThan(200);
  for (const handType of ["hour", "minute", "second"] as const)
    for (const handPivotX of [0, 0.25, 0.5, 0.9, 1])
      for (const time of ["00:00", "03:15", "09:45", "23:59"]) {
        const p = handPoints(
          {
            ...l,
            handType,
            handPivotX,
            handPivotY: 0.6,
            handReach: 1,
            handTail: 0.3,
          },
          time,
          42,
        )!;
        for (const x of [p.x1, p.x2]) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(400);
        }
        for (const y of [p.y1, p.y2]) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(400);
        }
      }
  expect(handPoints(l, "", 0)).toBeNull();
  expect(handPoints(l, "12:00", NaN)).toBeNull();
  expect(handPoints(l, "12:00", 60)).toBeNull();
});
test("AOD seconds hide or freeze while hour minute geometry and native protocol share one clock", () => {
  const p = project("Hands", true),
    s = { ...layer("hand"), handType: "second" as const, aod: true };
  p.layers = [layer("hand"), { ...layer("hand"), handType: "minute" }, s];
  expect(
    handPoints({ ...s, aodSeconds: "hide" }, "12:45", 30, true),
  ).toBeNull();
  const zero = handPoints(s, "12:45", 30, true)!;
  expect(zero.x2).toBeCloseTo(200);
  expect(zero.y2).toBeLessThan(200);
  expect(generationLayer(s)).toMatchObject({
    handClock: "deviceLocal",
    handType: "second",
    handPivotX: 0.5,
    handPivotY: 0.5,
  });
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source.match(/System.getClockTime\(/g)).toHaveLength(1);
  expect(source).toContain("var sec=low?0:clock.sec");
  expect(source).not.toContain("Timer");
  expect(source).toContain("import Toybox.Math");
  for (const bad of [
    { handType: "bad" },
    { handPivotX: -0.1 },
    { handPivotY: 1.1 },
    { handReach: 0 },
    { handTail: 0.4 },
  ])
    expect(() => validateProject({ ...p, layers: [{ ...s, ...bad }] })).toThrow(
      /指针/,
    );
});
test("hand inspector configures pivot reach width and second-hand AOD default, preserving edits on reload", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Hands"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "指针", exact: true }).click();
  await page.getByLabel("指针时间绑定", { exact: true }).selectOption("second");
  await page.getByLabel("转动中心 X", { exact: true }).fill("0.35");
  await page.getByLabel("转动中心 X", { exact: true }).blur();
  await page.getByLabel("指针线宽", { exact: true }).fill("3");
  await page.getByLabel("指针线宽", { exact: true }).blur();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await expect(dialog.locator('[data-hand-type="second"]')).toHaveCount(1);
  await dialog.getByRole("button", { name: "关闭预览", exact: true }).click();
  await page.getByLabel("指针长度比例", { exact: true }).fill("0.75");
  await page.getByLabel("指针长度比例", { exact: true }).blur();
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 Hands", exact: true }).click();
  await page.locator(".layer-row").first().click();
  await expect(page.getByLabel("转动中心 X", { exact: true })).toHaveValue(
    "0.35",
  );
  await expect(page.getByLabel("指针长度比例", { exact: true })).toHaveValue(
    "0.75",
  );
});
