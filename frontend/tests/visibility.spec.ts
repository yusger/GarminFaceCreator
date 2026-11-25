import { test, expect } from "@playwright/test";
import {
  conditionVisible,
  validateVisibility,
  nativeVisibility,
  type VisibilityCondition,
} from "../src/visibility";
import { project, layer, validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { generationRequirements } from "../src/generationRequirements";
import { generationLayer } from "../src/generationDto";
import { png } from "../../backend/tests/image-fixture.mjs";
const states: VisibilityCondition[] = [
  { source: "heartRate", max: 100, missingVisible: true, aod: "show" },
  { source: "heartRate", min: 100, max: 120, aod: "hide" },
  { source: "heartRate", min: 120, max: 140, maxInclusive: true, aod: "hide" },
  { source: "heartRate", min: 140, minExclusive: true, aod: "hide" },
];
test("PulseManiac's four static conditions cover exact HR boundaries and select only a neutral frame for missing readings or AOD", () => {
  for (const [value, index] of [
    [72, 0],
    [99.9, 0],
    [100, 1],
    [119.9, 1],
    [120, 2],
    [140, 2],
    [140.1, 3],
    [158, 3],
    [0, 0],
    [NaN, 0],
    [Infinity, 0],
    [-1, 0],
  ] as const) {
    expect(
      states.map((c) => conditionVisible(c, { heartRate: value })),
    ).toEqual(states.map((_, i) => i === index));
    expect(
      states.map((c) => conditionVisible(c, { heartRate: value }, true)),
    ).toEqual([true, false, false, false]);
  }
  expect(
    conditionVisible({ source: "battery", min: 0, max: 1 }, { battery: 0 }),
  ).toBe(true);
  expect(conditionVisible({ source: "battery" }, { battery: 101 })).toBe(false);
  for (const bad of [
    { source: "fake" },
    { source: "heartRate", min: 140, max: 100 },
    { source: "heartRate", min: 100, max: 100 },
    { source: "heartRate", min: NaN },
    { source: "heartRate", missingVisible: "true" },
  ])
    expect(() => validateVisibility(bad as any)).toThrow();
});
test("condition-only sources grant permissions and read one shared cached value; all image states remain in native resources", () => {
  const p = project("Condition", true);
  p.layers = states.map((visibility, i) => ({
    ...layer("image"),
    id: "state" + i,
    image: "data:image/png;base64," + png(200, 0, 0).toString("base64"),
    visibility,
  }));
  const requirements = generationRequirements(p);
  expect(requirements.permissions).toContain("SensorHistory");
  const files = localGenerate(p),
    source = files.find((f) => f.path === "source/App.mc")!.content,
    xml = files.find(
      (f) => f.path === "resources/drawables/drawables.xml",
    )!.content;
  expect(source.match(/getHeartRateHistory\(/g)).toHaveLength(1);
  expect(xml.match(/GfcImage_state/g)).toHaveLength(4);
  expect(xml).toContain('scaleX="150"');
  expect(nativeVisibility(p.layers[2], false)).toContain("dataheartRate<=140");
  expect(nativeVisibility(p.layers[3], false)).toContain("dataheartRate>140");
  expect(generationLayer(p.layers[2]).visibility).toEqual(states[2]);
  expect(validateProject(p).layers[2].visibility).toEqual(states[2]);
  expect(source).not.toContain("Timer");
});
test("verified Chinese date and captions declare real glyphs and preserve local dynamic dates", () => {
  const p = project("LocalDate", true);
  p.layers = [
    { ...layer("date"), dateLocale: "zh" },
    { ...layer("text"), text: "彻底疯狂", garminFont: "systemXTiny" },
  ];
  expect(generationRequirements(p).languages).toContain("zhs");
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source).toContain("calendar.month.format");
  expect(source).toContain("Graphics.FONT_SYSTEM_XTINY");
});
test("condition editor keeps invalid ranges in draft and persists applied visibility without excluding native content", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Condition"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "文字", exact: true }).click();
  await page.getByLabel("按数据条件显示", { exact: true }).check();
  await page.getByLabel("条件下限", { exact: true }).fill("120");
  await page.getByLabel("条件上限", { exact: true }).fill("100");
  await page.getByRole("button", { name: "应用显示条件", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "可见条件无效" }),
  ).toBeVisible();
  await page.getByLabel("条件上限", { exact: true }).fill("140");
  await page.getByLabel("包含上限值", { exact: true }).check();
  await page.getByRole("button", { name: "应用显示条件", exact: true }).click();
  await expect(
    page.getByLabel("包含在原生导出", { exact: true }),
  ).toBeChecked();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 Condition", exact: true })
    .click();
  await page.locator(".layer-row").first().click();
  await expect(page.getByLabel("条件上限", { exact: true })).toHaveValue("140");
  await expect(page.getByLabel("包含上限值", { exact: true })).toBeChecked();
});
for (const [target, size] of [
  ["venu445mm", "45mm"],
  ["venu441mm", "41mm"],
  ["fenix843mm", "43mm"],
] as const)
  test(
    "conditional PNG resources and Chinese date compile on " + target,
    async ({ request }) => {
      test.setTimeout(120000);
      test.skip(!process.env.GFC_TEST_URL, "Requires deployed SDK");
      const p = project("Condition", true);
      p.target = target;
      p.deviceSize = size;
      p.layers = [
        {
          ...layer("image"),
          image: "data:image/png;base64," + png(255, 0, 0).toString("base64"),
          visibility: states[0],
        },
        { ...layer("date"), dateLocale: "zh" },
        {
          ...layer("text"),
          text: "彻底疯狂",
          garminFont: "systemXTiny",
          visibility: states[3],
        },
      ];
      const form = new FormData();
      form.append(
        "project",
        JSON.stringify({
          projectId: p.id,
          projectName: p.name,
          appId: p.appId,
          target,
          deviceSize: size,
          revision: 0,
        }),
      );
      for (const f of localGenerate(p))
        form.append("files", new Blob([f.content]), f.path);
      form.append(
        "files",
        new Blob([png(255, 0, 0)]),
        "assets/" + p.layers[0].id + ".png",
      );
      const base = process.env.GFC_TEST_URL!;
      const r = await fetch(base + "/api/builds", {
        method: "POST",
        body: form,
      });
      expect(r.status, await r.clone().text()).toBe(202);
      const job = await r.json();
      for (let i = 0; i < 100; i++) {
        const state = await (
          await fetch(base + "/api/builds/" + job.buildId)
        ).json();
        if (
          ["succeeded", "failed", "cancelled", "interrupted"].includes(
            state.status,
          )
        ) {
          expect(
            state.status,
            await (
              await fetch(base + "/api/builds/" + job.buildId + "/logs")
            ).text(),
          ).toBe("succeeded");
          expect((await fetch(base + state.artifacts[0].url)).status).toBe(200);
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw Error("Build timeout");
    },
  );
