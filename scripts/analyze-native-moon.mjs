import { chromium } from "@playwright/test";
import * as fs from "node:fs/promises";
import { build } from "vite";
import { LOCAL_GENERATOR_VERSION } from "../frontend/src/localGenerator.ts";
const bundled = await build({
  configFile: false,
  logLevel: "silent",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: "frontend/tests/fixtures/moonHarness.ts",
      name: "MoonPixelAnalysis",
      formats: ["iife"],
    },
  },
});
const entry = (Array.isArray(bundled) ? bundled[0] : bundled).output.find(
  (f) => f.type === "chunk" && f.isEntry,
);
if (!entry) throw Error("Missing analysis harness");
(async () => {
  const b = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  });
  try {
    const page = await b.newPage();
    await page.addScriptTag({ content: entry.code });
    const input = JSON.parse(
      await fs.readFile("Temp/native-moon-fixtures/results.json", "utf8"),
    );
    if (
      input.records.length !== 3 ||
      input.records.some(
        (r) =>
          r.generator !== LOCAL_GENERATOR_VERSION + "-fixture" ||
          r.cleanup !== "completed",
      )
    )
      throw Error("Incomplete/stale native fixtures");
    const records = [];
    const allowed = new Set(["active-454", "active-390", "forced-aod-454"]);
    for (const r of input.records) {
      if (!allowed.delete(r.id)) throw Error("Duplicate/unknown fixture case");
      const dir = "Temp/native-moon-fixtures/" + r.id + "/",
        urls = {
          browser:
            "data:image/png;base64," +
            (await fs.readFile(dir + "browser.png")).toString("base64"),
          native:
            "data:image/png;base64," +
            (await fs.readFile(dir + "native.png")).toString("base64"),
        };
      const stats = await page.evaluate(
        async ({ urls, aod, target }) => {
          const imgs = await Promise.all(
              Object.values(urls).map(async (url) => {
                const i = await new Promise((resolve, reject) => {
                  const img = new Image();
                  img.onload = () => resolve(img);
                  img.onerror = reject;
                  img.src = url;
                });
                const canvas = document.createElement("canvas");
                canvas.width = i.width;
                canvas.height = i.height;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#000";
                ctx.fillRect(0, 0, i.width, i.height);
                ctx.drawImage(i, 0, 0);
                return {
                  width: i.width,
                  pixels: ctx.getImageData(0, 0, i.width, i.height).data,
                };
              }),
            ),
            n = imgs[0].width;
          let count = 0,
            err = 0,
            foreground = 0,
            foregroundErr = 0,
            nativeLit = 0,
            browserLit = 0;
          for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
              if (
                (x + 0.5 - n / 2) ** 2 + (y + 0.5 - n / 2) ** 2 >
                (n / 2) ** 2
              )
                continue;
              const i = (y * n + x) * 4;
              count++;
              let diff = 0;
              for (let k = 0; k < 3; k++)
                diff += Math.abs(imgs[0].pixels[i + k] - imgs[1].pixels[i + k]);
              err += diff;
              if (
                Math.max(
                  ...imgs[0].pixels.slice(i, i + 3),
                  ...imgs[1].pixels.slice(i, i + 3),
                ) > 80
              ) {
                foreground++;
                foregroundErr += diff;
              }
              if (Math.max(...imgs[0].pixels.slice(i, i + 3)) > 0) browserLit++;
              if (Math.max(...imgs[1].pixels.slice(i, i + 3)) > 0) nativeLit++;
            }
          return {
            aod: aod
              ? {
                  browser: window.gfcMoonFixture.analyzeAodPixels(
                    imgs[0].pixels,
                    n,
                    n,
                    target,
                    "browser-estimate",
                    "aod",
                  ),
                  native: window.gfcMoonFixture.analyzeAodPixels(
                    imgs[1].pixels,
                    n,
                    n,
                    target,
                    "native-frame",
                    "aod",
                  ),
                }
              : undefined,
            circularPixels: count,
            rgbMeanAbsoluteError: err / (3 * count),
            foregroundThreshold: 80,
            foregroundPixels: foreground,
            foregroundRgbMeanAbsoluteError: foregroundErr / (3 * foreground),
            nativeNonBlack: nativeLit,
            browserNonBlack: browserLit,
            nativeLitRatio: nativeLit / count,
            browserLitRatio: browserLit / count,
          };
        },
        { urls, aod: r.aod, target: r.target },
      );
      const expected = [
          0.5, 0.75, 0, 0.25, 0.5, 0.75, 0, 0.25, 0, 0.25, 0.5, 0.75,
        ],
        official = r.references.map((v, i) => ({
          ...v,
          expectedPrimaryPhase: expected[i],
          officialPhaseDistance: Math.min(
            Math.abs(v.sample.phase - expected[i]),
            1 - Math.abs(v.sample.phase - expected[i]),
          ),
          officialIlluminationDistance: Math.abs(
            v.sample.illumination -
              (expected[i] === 0 ? 0 : expected[i] === 0.5 ? 1 : 0.5),
          ),
        }));
      records.push({ ...r, references: official, pixels: stats });
    }
    await fs.writeFile(
      "Temp/native-moon-fixtures/comparison.json",
      JSON.stringify(
        {
          note: "Original screenshots, static controlled UTC drawing fixtures. Foreground threshold is a diagnostic mask, not an AOD lit threshold. Native-vs-web numerical parity is separate from official primary-phase comparison. Not hardware/Sleep or fidelity-percent acceptance.",
          records,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        records.map((r) => ({
          id: r.id,
          pixels: r.pixels,
          officialMaxPhase: Math.max(
            ...r.references.map((x) => x.officialPhaseDistance),
          ),
          officialMaxIllumination: Math.max(
            ...r.references.map((x) => x.officialIlluminationDistance),
          ),
        })),
      ),
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
