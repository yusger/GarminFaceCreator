import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { devices } from "../src/devices";
import { project } from "../src/domain";
import { suggestedLayout, applyLayout, guideInsetDesign } from "../src/layouts";
test("layout guidance scales physical pixels for every catalog size", () => {
  for (const d of devices) {
    const choice = { ...suggestedLayout(d, "large-time"), safeInsetPx: 40 };
    const p = applyLayout(
      { ...project(), target: d.id, deviceSize: d.size },
      choice,
    );
    expect(p.layers).toHaveLength(3);
    expect(guideInsetDesign(p)).toBeCloseTo((40 * 454) / d.pixels);
    expect(
      (p.layers.find((l) => l.kind === "time")!.size * d.pixels) / 454,
    ).toBeGreaterThanOrEqual(64);
  }
  expect(
    applyLayout(project(), suggestedLayout(devices[1], "blank")).layers,
  ).toHaveLength(0);
  expect(
    applyLayout(project("blank", true), suggestedLayout(devices[1], "basic"))
      .layers.length,
  ).toBeGreaterThan(0);
});
test("new small-device layout stores physical margin and keeps editor guide out of preview", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("布局测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByLabel("手表尺寸", { exact: true }).selectOption("41mm");
  await page.getByLabel("初始布局", { exact: true }).selectOption("large-time");
  await page.getByLabel("安全边距", { exact: true }).fill("24");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const guide = page.locator("svg.watch [data-layout-guide=true]");
  expect(Number(await guide.getAttribute("r"))).toBeCloseTo(
    227 - (24 * 454) / 390,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const p = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(p.target).toBe("venu441mm");
  expect(p.layoutGuide.safeInsetPx).toBe(24);
  expect(p.layoutGuide.presetId).toBe("large-time");
  expect(p.layers).toHaveLength(3);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(
    page.locator(".preview-studio [data-layout-guide=true]"),
  ).toHaveCount(0);
});
