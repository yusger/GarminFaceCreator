import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  parseBitmapFont,
  createBitmapFontAsset,
  bitmapFontInfo,
  bitmapFontDiagnostics,
  bitmapFontFiles,
  bitmapPngBytes,
} from "../src/bitmapFonts";
import { bitmapTextLayout, bitmapLayerPatch } from "../src/bitmapFontLayout";
import { fontMaskPng } from "../src/fontMaskPng";
import { project, layer, validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { applyChat } from "../src/designChat";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
import { mergeNativeFonts } from "../src/nativeFontResources";
import { fontChoicePatch } from "../src/fontChoices";
import { generationHeader } from "../src/generationDto";
import {bitmapDescriptor as descriptor,bitmapFixture} from "./fixtures/bitmapFixture";

test("BMFont parses one-page BMP metrics and applies kerning with pixel center alignment", () => {
  const info = parseBitmapFont(descriptor),
    v = bitmapTextLayout(info, "AVA", 5, 10, 20, 20);
  expect(v).toMatchObject({ width: 15, left: 7, top: 14 });
  expect(v.glyphs.map((g) => g.x)).toEqual([7, 11, 16]);
  expect(bitmapTextLayout(info, "AVA", 5, 10, 20, 20, "right").left).toBe(10);
});
test("BMFont rejects invalid pages, glyph bounds, duplicates, unknown records and kerning references", () => {
  for (const bad of [
    descriptor.replace('file="fixture.png"', 'file="../fixture.png"'),
    descriptor.replace("pages=1", "pages=2"),
    descriptor.replace("width=4 height=12", "width=40 height=12"),
    descriptor.replace("id=86 x=4", "id=65 x=4"),
    descriptor.replace("first=86 second=65", "first=87 second=65"),
    descriptor.replace("size=12", "size=-12"),
    descriptor.replace("unicode=1", "unicode=0"),
    descriptor + "channel id=1\n",
    descriptor.replace("count=3", "count=4"),
    descriptor.replace("amount=-2", "amount=-8"),
    descriptor.replace("base=10", "base=13"),
    descriptor.replace("xadvance=6", "xadvance=600"),
    descriptor.replace("size=12", "size=12 size=12"),
  ])
    expect(() => parseBitmapFont(bad)).toThrow();
});
test("font atlas identity, checksum, grayscale and license validation reject tampering", async () => {
  const p = await bitmapFixture(),
    f = p.bitmapFonts![0],
    info = bitmapFontInfo(f);
  validateProject(p);
  const bytes = bitmapPngBytes(f.atlasData, info);
  bytes[45] ^= 1;
  expect(() =>
    createBitmapFontAsset(
      descriptor,
      "data:image/png;base64," + Buffer.from(bytes).toString("base64"),
      "CC0",
    ),
  ).toThrow();
  expect(() => createBitmapFontAsset(descriptor, f.atlasData, "")).toThrow();
  expect(() =>
    validateProject({ ...p, bitmapFonts: [{ ...f, family: "Other" }] }),
  ).toThrow();
  expect(() => validateProject({ ...p, bitmapFonts: [f, f] })).toThrow();
  expect(() => validateProject({ ...p, bitmapFonts: [] })).toThrow();
  expect(() =>
    validateProject({
      ...p,
      layers: [{ ...p.layers[0], garminFont: "chalk" }],
    }),
  ).toThrow();
});
test("fixed target pixels, AOD sizes and missing glyphs block generation without fallback", async () => {
  const p = await bitmapFixture();
  expect(bitmapFontDiagnostics(p)).toEqual([]);
  for (const patch of [
    { size: 13 },
    { aod: true, aodSize: 10 },
    { text: "AVB" },
  ]) {
    const bad = { ...p, layers: [{ ...p.layers[0], ...patch }] };
    expect(bitmapFontDiagnostics(bad).length).toBeGreaterThan(0);
    expect(() => localGenerate(bad)).toThrow();
  }
  const p41 = await bitmapFixture("venu441mm");
  expect(bitmapFontDiagnostics(p41)).toEqual([]);
  expect(p41.layers[0].size).toBeCloseTo((12 * 454) / 390);
});
test("font generation filters unused glyphs, manages XML/helpers and snapshots embedded font bytes", async () => {
  const p = await bitmapFixture(),
    files = localGenerate(p),
    fnt = bitmapFontFiles(p)[0];
  expect(fnt.content).toContain("chars count=2");
  expect(fnt.content).not.toContain("char id=32");
  expect(fnt.content).toContain("kernings count=0");
  const unsupported = { ...p, target: "venu3", deviceSize: "45mm" };
  expect(bitmapFontDiagnostics(unsupported).length).toBeGreaterThan(0);
  const helper = files.find((f) => f.path === "source/GfcBitmapText.mc")!;
  expect(helper.content).toContain("65=>{86=>-2}");
  expect(helper.content).toContain("text.toCharArray()");
  expect(files.find((f) => f.path === "source/App.mc")!.content).toContain(
    "GfcBitmapText.draw",
  );
  const merged = mergeNativeFonts(p, files);
  expect(
    merged.filter((f) => f.path === "source/GfcBitmapText.mc"),
  ).toHaveLength(1);
  expect(
    merged
      .filter((f) => f.path.endsWith(".xml"))
      .map((f) => f.content)
      .join("")
      .match(/<font id="GfcBitmap_/g),
  ).toHaveLength(1);
  const saved = saveDesignSnapshot(p, "bitmap");
  expect(
    restoreDesignSnapshot(
      { ...saved, bitmapFonts: [] },
      saved.activeDesignSnapshot!,
    ).bitmapFonts,
  ).toEqual(p.bitmapFonts);
  expect(JSON.stringify(generationHeader(p))).not.toContain(
    p.bitmapFonts![0].atlasData.slice(0, 90),
  );
});
test("AI can select approved font identities atomically and respects locks and glyph coverage", async () => {
  const p = await bitmapFixture(),
    f = p.bitmapFonts![0];
  p.layers = [{ ...p.layers[0], bitmapFontId: undefined }];
  const raw = (fontId: string) =>
    JSON.stringify({
      message: "font",
      operations: [{ type: "font", id: p.layers[0].id, fontId }],
    });
  const next = applyChat(p, raw(f.id)).project;
  expect(next.layers[0].bitmapFontId).toBe(f.id);
  expect(
    fontChoicePatch(next, next.layers[0], "system:auto").bitmapFontId,
  ).toBeUndefined();
  expect(() =>
    applyChat(p, raw("bitmap_00000000000000000000000000000000")),
  ).toThrow();
  expect(() =>
    applyChat({ ...p, layers: [{ ...p.layers[0], locked: true }] }, raw(f.id)),
  ).toThrow();
  expect(() =>
    applyChat({ ...p, layers: [{ ...p.layers[0], text: "AVB" }] }, raw(f.id)),
  ).toThrow(/字形/);
  expect(p.layers[0].bitmapFontId).toBeUndefined();
});
for (const target of ["venu445mm", "venu441mm"])
  test(`bitmap managed font compiles ${target}`, async ({ request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK check");
    test.setTimeout(130000);
    const p = await bitmapFixture(target),
      form = new FormData();
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
    for (const f of [...localGenerate(p), ...bitmapFontFiles(p)])
      form.append("files", new Blob([f.content]), f.path);
    form.append(
      "files",
      new Blob([
        Buffer.from(p.bitmapFonts![0].atlasData.split(",")[1], "base64"),
      ]),
      bitmapFontFiles(p)[0].path.replace(/\.fnt$/, ".png"),
    );
    const response = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(response.status, await response.clone().text()).toBe(202);
    const j = await response.json(),
      headers = { Authorization: "Bearer " + j.accessToken };
    await expect
      .poll(
        async () => {
          const r = await (
            await request.get(`/api/builds/${j.buildId}`, { headers })
          ).json();
          if (r.status === "failed")
            throw Error(
              await (
                await request.get(`/api/builds/${j.buildId}/logs`, { headers })
              ).text(),
            );
          return r.status;
        },
        { timeout: 115000, intervals: [1000] },
      )
      .toBe("succeeded");
  });

test("bitmap font imports locally, renders one layer and survives save/reload and undo", async ({
  page,
}) => {
  const fixture = await bitmapFixture(),
    f = fixture.bitmapFonts![0];
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") posts++;
  });
  page.on("dialog", (d) => d.accept("BitmapUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "文字", exact: true }).click();
  await page.getByLabel("文字内容", { exact: true }).fill("AVA");
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await expect(page.getByLabel("导入位图字体")).toBeDisabled();
  await page.getByLabel("字体许可或授权说明").fill(f.license);
  await page.getByLabel("导入位图字体").setInputFiles([
    {
      name: "fixture.fnt",
      mimeType: "text/plain",
      buffer: Buffer.from(f.descriptor),
    },
    {
      name: "fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(f.atlasData.split(",")[1], "base64"),
    },
  ]);
  await expect(page.getByRole("dialog", { name: "字体素材库" })).toBeHidden();
  await expect(page.locator("[data-bitmap-font]")).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.getByLabel("字号", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("字重", { exact: true })).toBeDisabled();
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(page.locator("[data-bitmap-font]")).toHaveCount(0);
  await page.getByTitle("重做", { exact: true }).click();
  await expect(page.locator("[data-bitmap-font]")).toBeVisible();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 BitmapUI", exact: true })
    .click();
  await expect(page.locator("[data-bitmap-font]")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const exported = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(exported.bitmapFonts[0].atlasData).toBe(f.atlasData);
  expect(exported.layers[0].bitmapFontId).toBe(f.id);
  expect(posts).toBe(0);
});

test("source ZIP retains bitmap originals and license alongside generated subset resources", async ({
  page,
}) => {
  const { build } = await import("vite"),
    bundle = await build({
      configFile: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        write: false,
        minify: false,
        lib: {
          entry: "frontend/tests/fixtures/bitmapFontHarness.ts",
          name: "BitmapExportTest",
          formats: ["iife"],
        },
      },
    }),
    entry = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(
      (f) => f.type === "chunk" && f.isEntry,
    )!;
  const p = await bitmapFixture();
  p.files = localGenerate(p);
  p.codeRevision = p.revision;
  await page.goto("/");
  await page.addScriptTag({ content: entry.code });
  const raw = await page.evaluate(async (p) => {
      const h = (window as any).gfcBitmapHarness,
        result = await h.exportSources(p);
      return Array.from(new Uint8Array(await result.blob.arrayBuffer()));
    }, p),
    bytes = Buffer.from(raw),
    entries = new Map<string, Buffer>();
  let at = 0;
  while (bytes.readUInt32LE(at) === 0x04034b50) {
    expect(bytes.readUInt16LE(at + 8)).toBe(0);
    const size = bytes.readUInt32LE(at + 18),
      nameSize = bytes.readUInt16LE(at + 26),
      extraSize = bytes.readUInt16LE(at + 28),
      name = bytes.toString("utf8", at + 30, at + 30 + nameSize),
      start = at + 30 + nameSize + extraSize;
    entries.set(name, bytes.subarray(start, start + size));
    at = start + size;
  }
  const id = "GfcBitmap_" + p.bitmapFonts![0].id,
    root = "source-assets/fonts/" + id + "/";
  expect(entries.get(root + "original.fnt")!.toString()).toBe(descriptor);
  expect(entries.get(root + "LICENSE.txt")!.toString()).toContain(
    p.bitmapFonts![0].license,
  );
  expect(entries.get(root + "fixture.png")).toEqual(
    Buffer.from(p.bitmapFonts![0].atlasData.split(",")[1], "base64"),
  );
  expect(entries.get("resources/fonts/" + id + ".fnt")!.toString()).toContain(
    "chars count=2",
  );
  expect(entries.has("resources/fonts/" + id + ".png")).toBe(true);
  expect(entries.has("source/GfcBitmapText.mc")).toBe(true);
});
