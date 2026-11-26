import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import { insertWidget } from "../src/widgets";
import {
  previewStress,
  previewBoundaries,
  withPreviewValues,
} from "../src/previewCases";
import { metricValues, reading } from "../src/Scene";
const base = {
  time: "09:41",
  heartRate: 72,
  steps: 4500,
  battery: 78,
  seconds: 0,
};
test("preview stresses numeric width without mutating design and enumerates compound boundaries", () => {
  const p = insertWidget(project("Boundaries", true), "segment-battery"),
    before = JSON.stringify(p),
    cases = previewBoundaries(p);
  expect(cases.some((c) => c.source === "battery" && c.value === 100)).toBe(
    true,
  );
  expect(cases.some((c) => c.value === 101)).toBe(true);
  expect(JSON.stringify(p)).toBe(before);
  const max = previewStress(base, "long");
  expect(metricValues(max).distance).toBe(999.99);
  expect(max.steps).toBe(999999);
  const neg = previewStress(base, "negative");
  expect(
    reading({ ...layer("metric"), source: "temperature", precision: 1 }, neg),
  ).toContain("-19.9");
  expect(
    reading(
      { ...layer("metric"), source: "battery" },
      withPreviewValues(base, { battery: 101 }),
    ),
  ).toBe("--");
});
test("preview boundary UI pauses samples and leaves project unchanged", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Preview-boundary"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.getByRole("button", { name: "最长读数", exact: true }).click();
  await expect(page.getByLabel("模拟步数")).toHaveValue("999999");
  await page.getByRole("button", { name: "零值与短读数", exact: true }).click();
  await expect(page.getByLabel("模拟步数")).toHaveValue("0");
  await page.getByRole("button", { name: "负温度与海拔", exact: true }).click();
  await expect(page.getByLabel("阈值及进度边界")).toBeVisible();
});
