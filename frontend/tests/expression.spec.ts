import { test, expect } from "@playwright/test";
import { layer } from "../src/domain";
import { crossesScreen } from "../src/bounds";
import { reading } from "../src/Scene";
const preview = {
  time: "09:41",
  heartRate: 72,
  steps: 8642,
  battery: 78,
  seconds: 9,
};
test("rotated bounds distinguish circle geometry, intentional clipping and long text", () => {
  expect(crossesScreen({ ...layer("rect"), x: 0, y: 0, w: 100, h: 100 })).toBe(
    true,
  );
  expect(
    crossesScreen({
      ...layer("rect"),
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      allowClip: true,
    }),
  ).toBe(false);
  expect(
    crossesScreen({ ...layer("circle"), x: 0, y: 0, w: 454, h: 454 }),
  ).toBe(false);
  expect(
    crossesScreen({
      ...layer("rect"),
      x: 80,
      y: 80,
      w: 290,
      h: 40,
      rotation: 45,
    }),
  ).toBe(true);
  expect(
    crossesScreen(
      { ...layer("text"), x: 140, y: 180, w: 150, h: 50 },
      { width: 600, height: 28 },
    ),
  ).toBe(true);
});
test("metric formatting handles default and explicit units, decimals and missing data", () => {
  const l = { ...layer("metric"), source: "battery" };
  expect(reading(l, preview)).toBe("78%");
  expect(reading({ ...l, label: "BAT", unit: "", precision: 1 }, preview)).toBe(
    "BAT 78.0",
  );
  expect(
    reading(
      { ...l, label: "电量", missingValue: "未知" },
      { ...preview, missing: true },
    ),
  ).toBe("电量 未知");
  expect(reading({ ...l, source: "unknown" }, preview)).toBe("--");
});
test("text controls, metric format and boundary locator persist in the editor", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("表达测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "文字", exact: true }).click();
  await page.getByLabel("文字对齐", { exact: true }).selectOption("left");
  await page.getByLabel("字重", { exact: true }).selectOption("700");
  await page.getByLabel("Garmin 字体", { exact: true }).selectOption("small");
  await page.getByLabel("X", { exact: true }).fill("0");
  await page.getByLabel("Y", { exact: true }).fill("0");
  await page.getByText(/个图层超出圆屏边界/).click();
  await page.getByRole("button", { name: "定位 文字", exact: true }).click();
  await expect(
    page.locator("svg.watch text").filter({ hasText: "HELLO WORLD" }),
  ).toHaveAttribute("text-anchor", "start");
  await expect(
    page.locator("svg.watch text").filter({ hasText: "HELLO WORLD" }),
  ).toHaveAttribute("font-weight", "700");
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await page.getByLabel("数据标签", { exact: true }).fill("HR");
  await page.getByLabel("数据单位", { exact: true }).fill("bpm");
  await page.getByLabel("小数位", { exact: true }).selectOption("1");
  await expect(
    page.locator("svg.watch text").filter({ hasText: "HR 72.0bpm" }),
  ).toHaveCount(1);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 表达测试", exact: true })
    .click();
  await expect(
    page.locator("svg.watch text").filter({ hasText: "HR 72.0bpm" }),
  ).toHaveCount(1);
});
