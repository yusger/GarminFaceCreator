import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { timeText } from "../src/timeParts";
import { reading, ink } from "../src/Scene";
import { generationRequirements } from "../src/generationRequirements";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
const preview = {
  time: "09:41",
  seconds: 24,
  heartRate: 72,
  steps: 4500,
  battery: 78,
};
test("four independently colored digits preserve every leading zero and reconstruct the same 24h clock", () => {
  for (let hour = 0; hour < 24; hour++)
    for (let minute = 0; minute < 60; minute++) {
      const time =
        `${hour}`.padStart(2, "0") + ":" + `${minute}`.padStart(2, "0");
      expect(
        (["hourTens", "hourOnes", "minuteTens", "minuteOnes"] as const)
          .map((part) => timeText(time, part))
          .join(""),
      ).toBe(time.replace(":", ""));
    }
  expect(timeText("00:07", "hourTens")).toBe("0");
  expect(timeText("23:59", "minuteOnes")).toBe("9");
  expect(timeText("", "hourOnes")).toBe("--");
});
test("cached numeric HR uses its only required permission, guarded latest sample, missing and threshold policy", () => {
  const p = project("DigitsHR", true),
    hr = {
      ...layer("metric"),
      source: "heartRate",
      metricDecoration: false,
      thresholdFallback: "#123456",
    };
  p.layers = [hr, { ...hr, id: "another" }];
  expect(generationRequirements(p).permissions).toEqual(["SensorHistory"]);
  expect(generationRequirements(p).glyphs).not.toContain("♡");
  expect(generationLayer(hr).metricDecoration).toBe(false);
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source.match(/SensorHistory.getHeartRateHistory\(/g)).toHaveLength(1);
  expect(source).toContain(":period=>1");
  expect(source).toContain("sample!=null");
  expect(source).toContain("hr>0");
  expect(source).not.toContain("Sensor.setEnabledSensors");
  for (const value of [0, -1, NaN, Infinity]) {
    expect(reading(hr, { ...preview, heartRate: value })).toBe("--");
    expect(ink(hr, { ...preview, heartRate: value })).toBe("#123456");
  }
  for (const [value, color] of [
    [119, "#55ff99"],
    [120, "#ffee44"],
    [149, "#ffee44"],
    [150, "#ff5566"],
  ] as const)
    expect(ink(hr, { ...preview, heartRate: value })).toBe(color);
  expect(() =>
    validateProject({ ...p, layers: [{ ...hr, metricDecoration: "bad" }] }),
  ).toThrow();
  hr.exportIncluded = false;
  p.layers = [hr];
  expect(generationRequirements(p).permissions).toEqual([]);
});
test("digit selection and numeric HR settings generate native code and invalid preview-time input stays safe", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept("DigitsHR"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByLabel("时间部分", { exact: true }).selectOption("hourTens");
  await expect(page.locator("svg.watch text").first()).toHaveText("0");
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await page.getByLabel("显示心形符号", { exact: true }).uncheck();
  await expect(page.locator("svg.watch text").last()).toHaveText("72");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "文字报时", exact: true }).click();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await dialog.getByLabel("模拟时间").fill("");
  await dialog.getByRole("button", { name: "关闭预览", exact: true }).click();
  expect(errors).toEqual([]);
});
