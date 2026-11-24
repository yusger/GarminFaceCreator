import { test, expect } from "@playwright/test";
import { layer } from "../src/domain";
import { ink, ringLit } from "../src/Scene";
import { defaultThresholds, validateThresholds } from "../src/thresholds";
const d = {
  time: "09:41",
  heartRate: 72,
  steps: 5000,
  battery: 30,
  seconds: 24,
};
test("threshold boundaries gaps and invalid readings always have a fallback", () => {
  const l = {
    ...layer("metric"),
    thresholdFallback: "#112233",
    thresholdRules: defaultThresholds("heartRate", "#ffffff"),
  };
  for (const [heartRate, color] of [
    [119, "#55ff99"],
    [120, "#ffee44"],
    [149, "#ffee44"],
    [150, "#ff5566"],
  ] as const)
    expect(ink(l, { ...d, heartRate })).toBe(color);
  expect(ink(l, { ...d, heartRate: NaN })).toBe("#112233");
  expect(ink(l, { ...d, missing: true })).toBe("#112233");
  expect(
    ink(
      { ...l, thresholdRules: [{ min: 100, max: 120, color: "#ff0000" }] },
      d,
    ),
  ).toBe("#112233");
  expect(() =>
    validateThresholds(
      [
        { min: 0, max: 150, color: "#ff0000" },
        { min: 120, color: "#00ff00" },
      ],
      "#112233",
    ),
  ).toThrow(/重叠/);
  const battery = {
    ...l,
    source: "battery",
    thresholdRules: defaultThresholds("battery", "#ffffff"),
  };
  for (const [value, color] of [
    [9, "#ff5566"],
    [10, "#ffee44"],
    [29, "#ffee44"],
    [30, "#ffffff"],
  ] as const)
    expect(ink(battery, { ...d, battery: value })).toBe(color);
});
test("custom tick counts follow seconds or target progress and stop in AOD", () => {
  const l = { ...layer("ring"), ringTicks: 12 };
  expect(ringLit(l, { ...d, seconds: 0 })).toBe(0);
  expect(ringLit(l, { ...d, seconds: 30 })).toBe(6);
  expect(ringLit(l, { ...d, seconds: 59 })).toBe(11);
  expect(ringLit({ ...l, ringSource: "steps", ringGoal: 10000 }, d)).toBe(6);
  expect(ringLit(l, d, true)).toBe(0);
});
test("ring angles, count and independent AOD colors and visibility are editable", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("样式测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "圆环", exact: true }).click();
  await page.getByLabel("圆环刻度数", { exact: true }).fill("12");
  await page.getByLabel("圆环结束角", { exact: true }).fill("180");
  const id = await page
    .locator("svg.watch g[data-layer]")
    .last()
    .getAttribute("data-layer");
  const ring = page.locator(`svg.watch g[data-layer="${id}"]`);
  await expect(ring.locator("line")).toHaveCount(12);
  await expect(ring.locator("line").last()).toHaveAttribute("y2", "430");
  await expect(ring.locator('line[opacity="1"]')).toHaveCount(4);
  await page.getByLabel("在息屏布局显示", { exact: true }).check();
  await page.getByLabel("息屏颜色", { exact: true }).fill("#123456");
  await page.getByRole("button", { name: "息屏", exact: true }).click();
  await expect(ring.locator('line[opacity="1"]')).toHaveCount(0);
  await expect(ring.locator("line").first()).toHaveAttribute(
    "stroke",
    "#123456",
  );
  await page.getByLabel("息屏秒数与动画", { exact: true }).selectOption("hide");
  await expect(ring).toHaveCount(0);
  await page.getByLabel("息屏秒数与动画", { exact: true }).selectOption("zero");
  await expect(ring).toHaveCount(1);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
});
test("threshold editor rejects overlapping draft then applies validated ranges and fallback", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("阈值测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await page.getByLabel("阈值上界 1", { exact: true }).fill("150");
  await page.getByRole("button", { name: "应用阈值规则", exact: true }).click();
  await expect(page.locator(".threshold-editor [role=alert]")).toContainText(
    "重叠",
  );
  await page.getByLabel("阈值上界 1", { exact: true }).fill("100");
  await page.getByLabel("阈值兜底色", { exact: true }).fill("#112233");
  await page.getByRole("button", { name: "应用阈值规则", exact: true }).click();
  await expect(page.locator(".threshold-editor [role=alert]")).toHaveCount(0);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.getByLabel("模拟心率", { exact: true }).fill("110");
  await expect(
    page.locator("svg.watch text").filter({ hasText: "110" }).last(),
  ).toHaveAttribute("fill", "#112233");
});
