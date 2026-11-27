import { test, expect } from "@playwright/test";
import { build } from "vite";
import { readFile } from "node:fs/promises";
let harness: string;
test.beforeAll(async () => {
  const b = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: "frontend/tests/fixtures/rasterizeFontHarness.ts",
        name: "GfcRasterHarness",
        formats: ["iife"],
      },
    },
  });
  harness = (Array.isArray(b) ? b[0] : b).output.find(
    (x) => x.type === "chunk" && x.isEntry,
  )!.code;
});
test("browser rasterizer retains actual licenses and rejects missing glyphs, locked layers, invalid sizes and unknown fonts atomically", async ({
  page,
}) => {
  await page.goto("/");
  await page.addScriptTag({ content: harness });
  const r = await page.evaluate(async () => {
    const h = (window as any).gfcRaster,
      p = h.project("Raster", true),
      l = { ...h.layer("time"), id: "time" };
    p.layers = [l];
    const original = JSON.stringify(p),
      before = document.fonts.size;
    const a = await h.rasterizeProjectFont(p, l, "sonar_number_font", 28, "AV");
    const b = await h.rasterizeProjectFont(p, l, "sonar_number_font", 28, "AV");
    const info = h.bitmapFontInfo(a),
      errors = [];
    for (const args of [
      [l, "sonar_number_font", 28, "周"],
      [{ ...l, locked: true }, "sonar_number_font", 28, ""],
      [l, "sonar_number_font", 5, ""],
      [l, "sonar_number_font", 28.5, ""],
      [l, "absent", 28, ""],
      [l, "sonar_number_font", 28, "😀"],
    ])
      try {
        await h.rasterizeProjectFont(p, ...args);
        errors.push("not rejected");
      } catch (e) {
        errors.push((e as Error).message);
      }
    const bytes = await (
        await fetch("/fonts/sonar-number-font.ttf")
      ).arrayBuffer(),
      license = await (
        await fetch("/fonts/sonar-number-font-LICENSE.txt")
      ).text(),
      local = await h.importLocalFont(
        new File([bytes], "Owned.ttf"),
        license,
        "Local original notice",
      );
    p.localFonts = [local];
    const c = await h.rasterizeProjectFont(p, l, local.id, 24);
    return {
      sameId: a.id === b.id,
      unchanged: JSON.stringify({ ...p, localFonts: undefined }) === original,
      fontCount: document.fonts.size - before,
      license: a.license,
      localLicense: c.license,
      localSource: c.source,
      size: info.size,
      glyphs: Object.keys(info.glyphs),
      errors,
      bodyBytes: a.atlasData.length,
    };
  });
  expect(r.sameId).toBe(true);
  expect(r.unchanged).toBe(true);
  expect(r.fontCount).toBe(0);
  expect(r.license).toContain("SIL OPEN FONT LICENSE");
  expect(r.localLicense).toBe(r.license);
  expect(r.localSource).toBe("Local original notice");
  expect(r.size).toBe(28);
  expect(r.glyphs).toContain("86");
  expect(r.errors).toHaveLength(6);
  expect(r.errors.join("|")).not.toContain("not rejected");
  expect(r.errors[0]).toContain("缺字");
  expect(r.bodyBytes).toBeGreaterThan(100);
});
test("font library converts a licensed font, preserves physical size, saves and undoes without uploads", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  page.on("dialog", (d) => d.accept("RasterUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await page.getByLabel("转换目标像素字号", { exact: true }).fill("24");
  await page.getByLabel("转换附加字形子集", { exact: true }).fill("AV");
  await page
    .getByRole("button", { name: "转为固定像素字体：等宽科技字", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "字体素材库" })).toBeHidden();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const p = JSON.parse(await readFile((await (await wait).path())!, "utf8"));
  expect(p.bitmapFonts).toHaveLength(1);
  expect(p.bitmapFonts[0].license).toContain("SIL OPEN FONT LICENSE");
  expect(p.bitmapFonts[0].descriptor).toContain("size=24");
  expect(p.layers[0].bitmapFontId).toBe(p.bitmapFonts[0].id);
  expect(p.layers[0].customFont).toBeUndefined();
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toBeHidden();
  await page.getByTitle("重做", { exact: true }).click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toBeVisible();
  expect(posts).toEqual([]);
});
