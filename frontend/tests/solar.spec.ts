import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { solarSample, solarPoint, solarEventsState } from "../src/solar";
import { localGenerate } from "../src/localGenerator";
import { generationLayer } from "../src/generationDto";
import { generationRequirements } from "../src/generationRequirements";
test("solar samples use exact day boundaries, no polar fabrication, and a bounded illustrative arc", () => {
  expect(solarSample("05:59").state).toBe(0);
  expect(solarSample("06:00")).toEqual({ state: 1, progress: 0 });
  expect(solarSample("12:00")).toEqual({ state: 1, progress: 0.5 });
  expect(solarSample("18:00")).toEqual({ state: 0, progress: 0.5 });
  for (const [rise, set, missing] of [
    ["", "18:00", false],
    ["18:00", "06:00", false],
    ["06:00", "06:00", false],
    ["06:00", "18:00", true],
  ] as const)
    expect(solarSample("12:00", rise, set, missing).state).toBe(-1);
  let previous = -Infinity;
  for (let m = 360; m < 1080; m++) {
    const time =
        String(Math.floor(m / 60)).padStart(2, "0") +
        ":" +
        String(m % 60).padStart(2, "0"),
      s = solarSample(time),
      p = solarPoint({ w: 354, h: 180 }, s);
    expect(p.x).toBeGreaterThanOrEqual(previous);
    previous = p.x;
    expect(p.x - p.r * 1.55).toBeGreaterThanOrEqual(0);
    expect(p.x + p.r * 1.55).toBeLessThanOrEqual(354);
    expect(p.y - p.r * 1.55).toBeGreaterThanOrEqual(0);
    expect(p.y + p.r * 1.55).toBeLessThanOrEqual(180);
  }
});
test("Garmin date-shifted rise/set results are matched around UTC now, including night and missing polar windows", () => {
  const now = 1795535717,
    rise = 1795525777,
    previousSet = 1795474868;
  const rises = [rise - 86400, rise, rise + 86400],
    sets = [previousSet - 86400, previousSet, previousSet + 86400];
  const day = solarEventsState(now, rises, sets);
  expect(day.state).toBe(1);
  expect(day.progress).toBeCloseTo((now - rise) / (previousSet + 86400 - rise));
  expect(solarEventsState(previousSet + 86400, rises, sets).state).toBe(0);
  expect(solarEventsState(rise, rises, sets)).toEqual({
    state: 1,
    progress: 0,
  });
  for (const [r, t] of [
    [[], []],
    [[rise - 200000], []],
    [[], [previousSet]],
    [[rise], [rise]],
  ])
    expect(solarEventsState(now, r, t).state).toBe(-1);
});
test("native solar declares passive position, guarded Garmin API and missing/AOD cache policy", () => {
  const p = project("Solar", true);
  const sky = layer("celestial"),
    body = { ...sky, id: "body", solarPart: "body" as const };
  p.layers = [sky, body];
  expect(() => validateProject(p)).not.toThrow();
  expect(generationLayer(body)).toMatchObject({
    solarDataPolicy: "cachedPositionGarminSunTimes",
    moonPolicy: "nightIndicatorNotMoonPhase",
  });
  expect(generationRequirements(p).permissions).toEqual(["Positioning"]);
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source.match(/Position.getInfo\(/g)).toHaveLength(1);
  expect(source).toContain("info.position!=null");
  expect(source).toContain("Weather.getSunrise(info.position,query)");
  expect(source).toContain("Weather.getSunset(info.position,query)");
  expect(source).toContain("solarMinute==stamp");
  expect(source).toContain("sleeping?solarCached:getSolarState()");
  expect(source).toContain("solarCached=[-1,0.0]");
  expect(source).not.toContain("enableLocationEvents");
  expect(source).not.toContain("Timer");
  p.layers = p.layers.map((l) => ({ ...l, exportIncluded: false }));
  expect(generationRequirements(p).permissions).toEqual([]);
  expect(() =>
    validateProject({ ...p, layers: [{ ...sky, solarPart: "bad" }] }),
  ).toThrow();
  expect(() =>
    validateProject({ ...p, layers: [{ ...sky, solarNightColor: "invalid" }] }),
  ).toThrow();
});
test("sky/body layers change with explicit sunrise samples, missing hides marker and AOD hides scene", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Solar"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "昼夜场景", exact: true }).click();
  await page.getByRole("button", { name: "昼夜场景", exact: true }).click();
  await page.getByLabel("场景部分", { exact: true }).selectOption("body");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await dialog.getByLabel("模拟时间").fill("12:00");
  await expect(dialog.locator('[data-solar-state="1"]')).toHaveCount(2);
  await dialog.getByLabel("模拟时间").fill("22:00");
  await expect(dialog.locator('[data-solar-state="0"]')).toHaveCount(2);
  await dialog.getByLabel("模拟日出").fill("");
  await expect(dialog.locator('[data-solar-state="-1"]')).toHaveCount(1);
  await expect(dialog.getByText("N/A", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "关闭预览", exact: true }).click();
  await expect(page.locator(".drawer-caption")).not.toContainText("设计已更新");
  await page.getByLabel("场景夜间颜色", { exact: true }).fill("#ccddff");
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
});
