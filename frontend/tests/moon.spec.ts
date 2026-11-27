import {generationDiagnostics} from "../src/generationDiagnostics";
﻿import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  moonAt,
  previewMoon,
  moonContour,
  MOON_START,
  MOON_END,
} from "../src/moon";
import { nativeMoonFiles, needsNativeMoon } from "../src/nativeMoon";
import { suncalcLicense } from "../src/suncalcNotice";
import { project, layer, validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { reading, metricValues } from "../src/previewData";
import { applyChat } from "../src/designChat";
import { generationRequirements } from "../src/generationRequirements";
import { generationHeader } from "../src/generationDto";
// USNO 2026 primary phases, Universal Time. Not a guarantee for all dates or local orientation.
const references = [
  ["2026-01-03T10:03:00Z", 0.5],
  ["2026-01-10T15:48:00Z", 0.75],
  ["2026-01-18T19:52:00Z", 0],
  ["2026-01-26T04:47:00Z", 0.25],
  ["2026-02-01T22:09:00Z", 0.5],
  ["2026-02-09T12:43:00Z", 0.75],
  ["2026-02-17T12:01:00Z", 0],
  ["2026-02-24T12:27:00Z", 0.25],
  ["2026-11-09T07:02:00Z", 0],
  ["2026-11-17T11:48:00Z", 0.25],
  ["2026-11-24T14:53:00Z", 0.5],
  ["2026-12-01T06:08:00Z", 0.75],
] as const;
test("estimated lunar phase agrees with 12 official USNO instants to 0.02 cycle", () => {
  for (const [time, expected] of references) {
    const m = moonAt(Date.parse(time) / 1000)!;
    const distance = Math.min(
      Math.abs(m.phase - expected),
      1 - Math.abs(m.phase - expected),
    );
    expect(distance, time).toBeLessThan(0.02);
    expect(
      Math.abs(
        m.illumination - (expected === 0 ? 0 : expected === 0.5 ? 1 : 0.5),
      ),
      time,
    ).toBeLessThan(0.04);
  }
});
test("lunar UTC conversion, invalid dates, supported interval and missing data stay explicit", () => {
  const a = previewMoon({
      calendarDate: "2026-11-28",
      time: "08:00",
      seconds: 0,
      utcOffsetMinutes: 480,
    }),
    b = previewMoon({
      calendarDate: "2026-11-28",
      time: "00:00",
      seconds: 0,
      utcOffsetMinutes: 0,
    });
  expect(a).toEqual(b);
  for (const seconds of [NaN, Infinity, MOON_START - 1, MOON_END])
    expect(moonAt(seconds)).toBeNull();
  expect(moonAt(MOON_START)).not.toBeNull();
  for (const patch of [
    { missing: true },
    { calendarDate: "2026-02-30" },
    { time: "25:00" },
    { seconds: 60 },
  ])
    expect(
      previewMoon({
        calendarDate: "2026-11-28",
        time: "12:30",
        seconds: 0,
        ...patch,
      }),
    ).toBeNull();
});
test("lunar diagram has a bounded contour, half-disk direction and explicit southern mirror", () => {
  for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) {
    const n = moonContour(phase),
      s = moonContour(phase, true);
    expect(n).toHaveLength(50);
    n.forEach(([x, y], i) => {
      expect(Number.isFinite(x + y)).toBe(true);
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
      expect(s[i]).toEqual([-x, y]);
    });
  }
  expect(
    moonContour(0.25)
      .slice(0, 25)
      .every(([x]) => x >= 0),
  ).toBe(true);
  expect(
    moonContour(0.75)
      .slice(0, 25)
      .every(([x]) => x <= 0),
  ).toBe(true);
});
test("lunar display always marks estimates and preserves true zero versus missing", () => {
  const d = {
      calendarDate: "2026-11-28",
      time: "12:30",
      seconds: 0,
      utcOffsetMinutes: 0,
      heartRate: 80,
      steps: 4500,
      battery: 50,
    },
    l = {
      ...layer("metric"),
      source: "moonIllumination",
      label: "",
      unit: "%",
      precision: 0,
      metricDecoration: false,
    };
  expect(reading(l, d)).toMatch(/^~\d+%$/);
  expect(reading(l, { ...d, values: { moonIllumination: 0 } })).toBe("~0%");
  expect(reading(l, { ...d, values: { moonIllumination: null } })).toBe("--");
  expect(metricValues(d).moonIllumination).toBeGreaterThan(0);
});
test("moon stays a single editable object and managed generation is cached with no position/weather permission", async () => {
  const p = project("Moon", true);
  p.layers = [
    layer("moon"),
    {
      ...layer("metric"),
      source: "moonIllumination",
      unit: "%",
      precision: 0,
      metricDecoration: false,
    },
  ];
  validateProject(p);
  expect(generationRequirements(p).permissions).toEqual([]);
  const files = localGenerate(p),
    app = files.find((f) => f.path === "source/App.mc")!.content,
    helper = nativeMoonFiles(p)[0].content;
  expect(app).toContain("GfcMoon.draw(dc");
  expect(app).toContain('label+="~"');
  expect(app).not.toContain("import Toybox.Position");
  expect(app).not.toContain("import Toybox.Weather");
  expect(helper).toContain("if(low){return cached;}");
  expect(helper).toContain("stamp!=anchor");
  expect(helper).toContain("i<=24");
  expect(helper).not.toContain("requestSensorData");
  expect(needsNativeMoon(p)).toBe(true);
  expect(generationHeader(p).nativeMoonHelpers[0].path).toBe(
    "source/GfcMoon.mc",
  );
  expect(
    await readFile("resources/licenses/suncalc-1.9.0-LICENSE.txt", "utf8"),
  ).toBe(suncalcLicense);
  const raw = JSON.stringify({
    message: "mirror",
    operations: [
      {
        type: "update",
        id: p.layers[0].id,
        patch: { moonHemisphere: "south", w: 100, h: 100 },
      },
    ],
  });
  const next = applyChat(p, raw).project;
  expect(next.layers).toHaveLength(2);
  expect(next.layers[0].moonHemisphere).toBe("south");
  expect(() => applyChat(p, raw.replace('"south"', '"localTilt"'))).toThrow();
});
test("113 moon icon resizes, mirrors, persists and stays one object", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("MoonUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "月相", exact: true }).click();
  await page.getByLabel("宽度", { exact: true }).fill("100");
  await page.getByLabel("高度", { exact: true }).fill("100");
  await page.getByLabel("月相示意方向").selectOption("south");
  await expect(page.locator("[data-moon-phase]")).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 MoonUI", exact: true }).click();
  await page.locator(".layer-row").first().click();
  await expect(page.getByLabel("月相示意方向")).toHaveValue("south");
  await expect(page.locator("[data-moon-phase]")).toBeVisible();
});
for (const target of ["venu445mm", "venu441mm"])
  test(`moon diagram and illumination compile ${target}`, async ({
    request,
  }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK check");
    test.setTimeout(130000);
    const p = project("MoonSDK", true);
    p.target = target;
    p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
    p.layers = [
      layer("moon"),
      { ...layer("moon"), id: "south", moonHemisphere: "south" },
      {
        ...layer("metric"),
        source: "moonIllumination",
        label: "",
        unit: "%",
        precision: 0,
        metricDecoration: false,
      },
    ];
    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: p.id,
        projectName: p.name,
        target,
        appId: p.appId,
        revision: p.revision,
      }),
    );
    for (const f of localGenerate(p))
      form.append("files", new Blob([f.content]), f.path);
    const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(r.status, await r.clone().text()).toBe(202);
    const job = await r.json(),
      headers = { Authorization: "Bearer " + job.accessToken };
    await expect
      .poll(
        async () => {
          const state = await (
            await request.get(`/api/builds/${job.buildId}`, { headers })
          ).json();
          if (state.status === "failed")
            throw Error(
              await (
                await request.get(`/api/builds/${job.buildId}/logs`, {
                  headers,
                })
              ).text(),
            );
          return state.status;
        },
        { timeout: 115000, intervals: [1000] },
      )
      .toBe("succeeded");
  });

test("moon layer budget is visible before generation",()=>{const p=project("MoonBudget",true);p.layers=Array.from({length:9},(_,i)=>({...layer("moon"),id:"moon"+i}));expect(generationDiagnostics(p).some(d=>d.code==="MOON_LAYER_BUDGET")).toBe(true);expect(()=>localGenerate(p)).toThrow(/8/);});
