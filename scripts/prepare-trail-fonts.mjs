// Browser-local deterministic resource build; no model/build/native request.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "vite";
import { chromium } from "@playwright/test";
const apply = process.argv.slice(2).join(" ") === "--write-reference";
if (process.argv.length > 2 && !apply)
  throw Error("Only --write-reference accepted");
if (!process.env.GFC_TEST_URL) throw Error("Set authorized GFC_TEST_URL");
const root = "resources/default-watchfaces/trail",
  output = "Temp/trail-theme-fonts-" + Date.now();
await mkdir(output, { recursive: true });
let p = JSON.parse(await readFile(root + "/design.json", "utf8")),
  source;
try {
  source = JSON.parse(
    await readFile(root + "/design-source/font-preparation.json", "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  source = {
    format: "gfc-trail-font-preparation",
    formatVersion: 1,
    fontRoles: p.fontRoles,
    layers: p.layers
      .filter((l) => l.customFont)
      .map(({ id, customFont, size, aodSize, fontWeight }) => ({
        id,
        customFont,
        size,
        aodSize,
        fontWeight,
      })),
  };
}
if (
  source.format !== "gfc-trail-font-preparation" ||
  source.formatVersion !== 1 ||
  !Array.isArray(source.layers)
)
  throw Error("Invalid font preparation source");
p.multiDevice = undefined;
p.bitmapFonts = undefined;
p.fontRoles = source.fontRoles;
p.target = "venu445mm";
p.deviceSize = "45mm";
p.layers = p.layers.map((l) => {
  const original = source.layers.find((s) => s.id === l.id);
  if (!original) return l;
  const {
    bitmapFontId,
    bitmapTracking,
    bitmapTabular,
    bitmapBaselineShift,
    bitmapLineHeight,
    ...rest
  } = l;
  return { ...rest, ...original, garminFont: "auto" };
});
const bundled = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: "frontend/tests/fixtures/themeFontHarness.ts",
        name: "GfcThemeFontHarness",
        formats: ["iife"],
      },
    },
  }),
  entry = (Array.isArray(bundled) ? bundled[0] : bundled).output.find(
    (f) => f.type === "chunk" && f.isEntry,
  );
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.GFC_TEST_URL);
  await page.addScriptTag({ content: entry.code });
  const result = await page.evaluate(async (p) => {
    const h = window.gfcThemeFonts,
      out = await h.prepareThemeFontResources(p);
    return {
      project: out,
      report: {
        fontAssets: out.bitmapFonts.length,
        fontRoles: out.fontRoles.length,
        atlasBytes: out.bitmapFonts.reduce(
          (n, f) => n + atob(f.atlasData.split(",")[1]).length,
          0,
        ),
        targets: out.multiDevice.variants.map((v) => {
          const q = h.projectForDevice(out, v.key);
          return {
            target: v.target,
            fonts: h.usedBitmapFonts(q).length,
            issues: h.bitmapFontDiagnostics(q),
          };
        }),
      },
    };
  }, p);
  await writeFile(
    output + "/project.json",
    JSON.stringify(result.project, null, 2) + "\n",
  );
  await writeFile(
    output + "/report.json",
    JSON.stringify(result.report, null, 2) + "\n",
  );
  if (apply) {
    for (const t of result.project.themes.presets) t.version = "1.2.0";
    await writeFile(
      root + "/design-source/font-preparation.json",
      JSON.stringify(source, null, 2) + "\n",
    );
    await writeFile(
      root + "/design.json",
      JSON.stringify(result.project, null, 2) + "\n",
    );
    const descriptor = JSON.parse(
      await readFile(root + "/reference.json", "utf8"),
    );
    descriptor.version = "1.2.0";
    await writeFile(
      root + "/reference.json",
      JSON.stringify(descriptor, null, 2) + "\n",
    );
  }
  console.log(
    JSON.stringify({ output, applied: apply, ...result.report }, null, 2),
  );
} finally {
  await browser.close();
}
