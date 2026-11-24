import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { migrateProject } from "../src/migrations";
import { reading } from "../src/Scene";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
const preview = {
  time: "00:07",
  heartRate: 80,
  steps: 4500,
  battery: 78,
  seconds: 9,
};
test("time parts preserve midnight and minute padding in preview, protocol and native output", () => {
  const p = project("Time Parts", true);
  const hours = {
    ...layer("time"),
    timePart: "hours" as const,
    color: "#ffaa00",
  };
  const minutes = {
    ...layer("time"),
    timePart: "minutes" as const,
    color: "#00aaff",
  };
  expect(reading(hours, preview)).toBe("00");
  expect(reading(minutes, preview)).toBe("07");
  expect(reading(layer("time"), preview)).toBe("00:07");
  expect(reading(hours, { ...preview, time: "23:59" })).toBe("23");
  expect(generationLayer(hours).timePart).toBe("hours");
  expect(generationLayer(layer("time")).timePart).toBe("full");
  p.layers = [hours, minutes];
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source).toContain('clock.hour.format("%02d")');
  expect(source).toContain('clock.min.format("%02d")');
  expect(source).not.toContain('+":"+');
  expect(source).toContain("0xffaa00");
  expect(source).toContain("0x00aaff");
  expect(source.match(/var clock=System.getClockTime/g)).toHaveLength(1);
  expect(() =>
    validateProject({ ...p, layers: [{ ...hours, timePart: "invalid" }] }),
  ).toThrow(/格式/);
});
test("v11 migration covers active layers and design snapshots without rewriting historic source", () => {
  const p = project("Legacy Time", true);
  p.layers = [layer("time")];
  p.files = [{ path: "source/App.mc", content: "// original program" }];
  p.designSnapshots = [
    { id: "snapshot", name: "old", at: 1, layers: [layer("time")] },
  ];
  const old = { ...p, schemaVersion: 11 as const };
  const next = migrateProject(old);
  expect(next.schemaVersion).toBe(15);
  expect(next.layers[0].timePart).toBe("full");
  expect(next.designSnapshots![0].layers[0].timePart).toBe("full");
  expect(next.files).toEqual(old.files);
  expect(next.layers[0].id).toBe(old.layers[0].id);
  expect(old.layers[0].timePart).toBeUndefined();
  expect(migrateProject(next)).toEqual(next);
});
test("time part selection changes the canvas, persists and produces native code without a model", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Time Parts"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByLabel("时间部分", { exact: true }).selectOption("minutes");
  await expect(page.locator("svg.watch g[data-layer] text").first()).toHaveText(
    /^\d{2}$/,
  );
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  const open = page.getByRole("button", {
    name: "打开 Time Parts",
    exact: true,
  });
  await open.click();
  await page.locator("svg.watch g[data-layer]").first().click();
  await expect(page.getByLabel("时间部分", { exact: true })).toHaveValue(
    "minutes",
  );
});
