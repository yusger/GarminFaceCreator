import { bitmapFixture } from "./fixtures/bitmapFixture";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { typographyFixture } from "./fixtures/bitmapTypographyFixture";
import {
  bitmapTextLayout,
  bitmapLayerBaseline,
  bitmapBaselinePatch,
} from "../src/bitmapFontLayout";
import {
  bitmapFontInfo,
  bitmapFontDiagnostics,
  bitmapFontFiles,
} from "../src/bitmapFonts";
import { batchBitmapTypography } from "../src/bitmapTypography";
import { validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { fontChoicePatch } from "../src/fontChoices";
import { applyChat, chatPayload } from "../src/designChat";
import { nativeFontBindings } from "../src/nativeFontResources";

test("tabular digits retain stable advances around separators; tracking and letter kerning are independent", async () => {
  const p = await typographyFixture(),
    info = bitmapFontInfo(p.bitmapFonts![0]);
  expect(bitmapTextLayout(info, "11:11", 0, 0, 100, 40, "left").width).not.toBe(
    bitmapTextLayout(info, "88:88", 0, 0, 100, 40, "left").width,
  );
  const options = { bitmapTracking: 2, bitmapTabular: true };
  const a = bitmapTextLayout(info, "11:11", 0, 0, 100, 40, "left", options),
    b = bitmapTextLayout(info, "88:88", 0, 0, 100, 40, "left", options);
  expect(a.width).toBe(39);
  expect(b.width).toBe(39);
  expect(a.glyphs.map((g) => g.x)).toEqual([2, 11, 18, 25, 34]);
  expect(
    bitmapTextLayout(info, "AVA", 0, 0, 100, 40, "left", options).width,
  ).toBe(20);
  expect(
    bitmapTextLayout(info, "11:11", 0, 100, 100, 40, "left", {
      ...options,
      bitmapLineHeight: 20,
      bitmapBaselineShift: -3,
    }),
  ).toMatchObject({ top: 107, baseline: 118, lineHeight: 20 });
});

for (const target of ["venu445mm", "venu441mm"])
  test(`baseline snapping uses physical pixels ${target}`, async () => {
    const p = await typographyFixture(target),
      a = { ...p.layers[0], bitmapBaselineShift: -3, bitmapLineHeight: 20 };
    const patch = bitmapBaselinePatch(p, a, p.layers[1]);
    expect(bitmapLayerBaseline(p, { ...a, ...patch })).toBe(
      bitmapLayerBaseline(p, p.layers[1]),
    );
    expect(() =>
      bitmapBaselinePatch(p, a, { ...p.layers[1], y: -500 }),
    ).toThrow(/超出/);
  });

test("invalid typography, incomplete digits and insufficient line height are explicit failures", async () => {
  const p = await typographyFixture();
  for (const patch of [
    { bitmapTracking: 13 },
    { bitmapTracking: 1.5 },
    { bitmapBaselineShift: -65 },
    { bitmapLineHeight: 513 },
    { bitmapTabular: "yes" },
    { bitmapFontId: undefined, bitmapTracking: 1 },
  ])
    expect(() =>
      validateProject({ ...p, layers: [{ ...p.layers[0], ...patch }] }),
    ).toThrow();
  const incomplete = await bitmapFixture();
  incomplete.layers[0].bitmapTabular = true;
  expect(
    bitmapFontDiagnostics(incomplete).some((d) =>
      d.message.includes("等宽数字"),
    ),
  ).toBe(true);
  expect(() => localGenerate(incomplete)).toThrow();
  const bad = { ...p, layers: [{ ...p.layers[0], bitmapLineHeight: 6 }] };
  expect(bitmapFontDiagnostics(bad)[0].message).toContain("行高");
  expect(() => localGenerate(bad)).toThrow();
});

test("batch typography is atomic, preserves geometry/data/colour and fails on locks or missing glyphs", async () => {
  const p = await typographyFixture();
  Object.assign(p.layers[0], {
    bitmapTracking: 2,
    bitmapTabular: true,
    bitmapBaselineShift: -3,
    bitmapLineHeight: 20,
  });
  const before = JSON.stringify(p),
    next = batchBitmapTypography(p, ["digits", "unit"], "digits");
  expect(next[1]).toMatchObject({
    x: 270,
    y: 250,
    color: "#FF77BB",
    source: p.layers[1].source,
    bitmapTracking: 2,
    bitmapTabular: true,
    bitmapBaselineShift: -3,
    bitmapLineHeight: 20,
  });
  expect(JSON.stringify(p)).toBe(before);
  for (const patch of [{ locked: true }, { text: "周五" }]) {
    const bad = { ...p, layers: [p.layers[0], { ...p.layers[1], ...patch }] },
      snapshot = JSON.stringify(bad);
    expect(() =>
      batchBitmapTypography(bad, ["digits", "unit"], "digits"),
    ).toThrow();
    expect(JSON.stringify(bad)).toBe(snapshot);
  }
});

test("font changes clear incompatible metrics and AI edits remain validated and atomic", async () => {
  const p = await typographyFixture();
  Object.assign(p.layers[0], { bitmapTracking: 2, bitmapTabular: true });
  const reset = fontChoicePatch(p, p.layers[0], "system:auto");
  expect(reset.bitmapTracking).toBeUndefined();
  expect(reset.bitmapTabular).toBeUndefined();
  validateProject({
    ...p,
    layers: [{ ...p.layers[0], ...reset }, p.layers[1]],
  });
  const response = (patch: unknown) =>
    JSON.stringify({
      message: "排版",
      operations: [{ type: "update", id: "digits", patch }],
    });
  expect(
    applyChat(p, response({ bitmapTracking: 3, bitmapBaselineShift: -2 }))
      .project.layers[0],
  ).toMatchObject({ bitmapTracking: 3, bitmapBaselineShift: -2 });
  expect(() => applyChat(p, response({ bitmapTracking: -1 }))).toThrow();
  expect(p.layers[0].bitmapTracking).toBe(2);
  expect(JSON.stringify(chatPayload(p, ["digits"]))).toContain(
    "bitmapTypographyPolicy",
  );
});

test("managed native layout receives physical options while the old draw signature remains available", async () => {
  const p = await typographyFixture();
  Object.assign(p.layers[0], {
    bitmapTracking: 2,
    bitmapTabular: true,
    bitmapBaselineShift: -3,
    bitmapLineHeight: 20,
  });
  const files = localGenerate(p),
    app = files.find((f) => f.path === "source/App.mc")!.content,
    helper = files.find((f) => f.path === "source/GfcBitmapText.mc")!.content;
  expect(app).toContain("GfcBitmapText.drawDetailed");
  expect(app).toContain(",2,true,-3,20);");
  expect(helper).toContain(
    "drawDetailed(dc,x,y,w,h,font,id,text,align,0,false,0,0)",
  );
  expect(nativeFontBindings(p)[0]).toMatchObject({
    renderMethod: "GfcBitmapText.drawDetailed",
    bitmapTypography: {
      tracking: 2,
      tabular: true,
      baselineShift: -3,
      lineHeight: 20,
    },
  });
});

for (const target of ["venu445mm", "venu441mm"])
  test(`advanced bitmap typography SDK ${target}`, async ({ request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK test");
    test.setTimeout(130000);
    const p = await typographyFixture(target);
    Object.assign(p.layers[0], {
      bitmapTracking: 2,
      bitmapTabular: true,
      bitmapBaselineShift: -3,
      bitmapLineHeight: 20,
    });
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
    const fonts = bitmapFontFiles(p);
    for (const f of [...localGenerate(p), ...fonts])
      form.append("files", new Blob([f.content]), f.path);
    form.append(
      "files",
      new Blob([
        Buffer.from(p.bitmapFonts![0].atlasData.split(",")[1], "base64"),
      ]),
      fonts[0].path.replace(/\.fnt$/, ".png"),
    );
    const response = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(response.status, await response.clone().text()).toBe(202);
    const job = await response.json(),
      headers = { Authorization: "Bearer " + job.accessToken };
    await expect
      .poll(
        async () => {
          const r = await (
            await request.get(`/api/builds/${job.buildId}`, { headers })
          ).json();
          if (r.status === "failed")
            throw Error(
              await (
                await request.get(`/api/builds/${job.buildId}/logs`, {
                  headers,
                })
              ).text(),
            );
          return r.status;
        },
        { timeout: 115000, intervals: [1000] },
      )
      .toBe("succeeded");
  });

test("editor typography, accurate sample width, baseline and batch settings persist locally", async ({
  page,
}) => {
  const p = await typographyFixture();
  Object.assign(p.layers[0], {
    kind: "metric",
    source: "steps",
    unit: "",
    label: "",
    metricDecoration: false,
  });
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") posts++;
  });
  await page.goto("/");
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("garmin-face-creator", 2);
        request.onsuccess = () => {
          const db = request.result,
            t = db.transaction("projects", "readwrite");
          t.objectStore("projects").put(value);
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
      }),
    p,
  );
  await page.reload();
  await page.getByRole("button", { name: "我的表盘", exact: true }).click();
  await page
    .getByRole("button", { name: "打开 BitmapTypography", exact: true })
    .click();
  const row = (name: string) =>
    page.locator(".layer-row").filter({ hasText: name });
  await row("Digits").click();
  await page.getByLabel("字距（目标像素）", { exact: true }).fill("2");
  await page.getByLabel("等宽数字", { exact: true }).check();
  await page.getByLabel("基线偏移（目标像素）", { exact: true }).fill("-3");
  await page.getByLabel("行高（0使用字体原值）", { exact: true }).fill("");
  await page
    .getByLabel("行高（0使用字体原值）", { exact: true })
    .pressSequentially("20");
  await expect(page.getByText(/位图精确字宽/)).toBeVisible();
  await page.getByLabel("最大读数样本", { exact: true }).fill("9".repeat(48));
  await expect(page.getByText(/可能溢出，请加宽文字框/)).toBeVisible();
  await row("Unit").click();
  await row("Digits").click({ modifiers: ["Shift"] });
  await page
    .getByRole("button", { name: "应用字体与排版到选中文字", exact: true })
    .click();
  await page.getByLabel("对齐基线目标", { exact: true }).selectOption("unit");
  await page.getByRole("button", { name: "对齐文字基线", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(saved.schemaVersion).toBe(48);
  expect(saved.layers[1]).toMatchObject({
    bitmapTracking: 2,
    bitmapTabular: true,
    color: "#FF77BB",
    x: 270,
    y: 250,
  });
  expect(bitmapLayerBaseline(saved, saved.layers[0])).toBe(
    bitmapLayerBaseline(saved, saved.layers[1]),
  );
  expect(saved.layers[0].source).toBe("steps");
  await page.reload();
  await page
    .getByRole("button", { name: "打开 BitmapTypography", exact: true })
    .click();
  await row("Digits").click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toHaveValue("2");
  await page.getByLabel("字距（目标像素）", { exact: true }).fill("3");
  await page.getByLabel("字距（目标像素）", { exact: true }).press("Enter");
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toHaveValue("2");
  expect(posts).toBe(0);
});
