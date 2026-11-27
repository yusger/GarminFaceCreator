import { chromium } from "@playwright/test";
import { build } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_GENERATOR_VERSION } from "../frontend/src/localGenerator.ts";
const dir = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw Error("Pass a completed capture directory");
const input = JSON.parse(
  await readFile(path.join(dir, "results.json"), "utf8"),
);
const allowed = new Set(["active-454", "active-390", "forced-aod-454"]);
if (input.records.length !== 3)
  throw Error("Three completed native cases required");
const bundle = await build({
  configFile: false,
  logLevel: "silent",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: "frontend/tests/fixtures/moonHarness.ts",
      name: "TypographyPixelAnalysis",
      formats: ["iife"],
    },
  },
});
const entry = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(
  (f) => f.type === "chunk" && f.isEntry,
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: entry.code });
  const records = [];
  for (const r of input.records) {
    if (
      !allowed.delete(r.id) ||
      r.cleanup !== "completed" ||
      r.generator !== LOCAL_GENERATOR_VERSION + "-fixture"
    )
      throw Error("Incomplete, duplicate or stale capture");
    const urls = await Promise.all(
      ["browser", "native"].map(
        async (k) =>
          "data:image/png;base64," +
          (await readFile(path.join(dir, r.id, k + ".png"))).toString("base64"),
      ),
    );
    const pixels = await page.evaluate(
      async ({ urls, r }) => {
        const images = await Promise.all(
          urls.map(
            (src) =>
              new Promise((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = src;
              }),
          ),
        );
        const n = images[0].width;
        if (
          images.some((i) => i.width !== n || i.height !== n) ||
          n !== r.width
        )
          throw Error("Capture size mismatch");
        const arrays = images.map((img) => {
          const c = document.createElement("canvas");
          c.width = c.height = n;
          const g = c.getContext("2d");
          g.fillStyle = "#000";
          g.fillRect(0, 0, n, n);
          g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, n, n).data;
        });
        const inside = (x, y) =>
          (x + 0.5 - n / 2) ** 2 + (y + 0.5 - n / 2) ** 2 <= (n / 2) ** 2;
        const lit = (a, x, y) => {
          if (x < 0 || x >= n || y < 0 || y >= n || !inside(x, y)) return false;
          const i = (y * n + x) * 4;
          return Math.max(a[i], a[i + 1], a[i + 2]) > 80;
        };
        let count = 0,
          err = 0,
          fg = 0,
          fgErr = 0;
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++)
            if (inside(x, y)) {
              count++;
              const i = (y * n + x) * 4;
              let d = 0;
              for (let k = 0; k < 3; k++)
                d += Math.abs(arrays[0][i + k] - arrays[1][i + k]);
              err += d;
              if (lit(arrays[0], x, y) || lit(arrays[1], x, y)) {
                fg++;
                fgErr += d;
              }
            }
        const rows = r.metrics.map((m) => {
          const y0 = m.y,
            y1 = m.y + m.h;
          const bounds = arrays.map((a) => {
            let x0 = n,
              t = n,
              x1 = -1,
              b = -1;
            for (let y = y0; y < y1; y++)
              for (let x = 0; x < n; x++)
                if (lit(a, x, y)) {
                  x0 = Math.min(x0, x);
                  t = Math.min(t, y);
                  x1 = Math.max(x1, x);
                  b = Math.max(b, y);
                }
            return x1 < 0 ? null : { x: x0, y: t, right: x1, bottom: b };
          });
          const offsets = Array.from({ length: 7 }, (_, i) => i - 3).map(
            (dy) => {
              let sum = 0,
                points = 0;
              for (let y = y0; y < y1; y++)
                for (let x = 0; x < n; x++) {
                  if (!lit(arrays[0], x, y) && !lit(arrays[1], x, y + dy))
                    continue;
                  const a = (y * n + x) * 4,
                    b = ((y + dy) * n + x) * 4;
                  points++;
                  for (let k = 0; k < 3; k++)
                    sum += Math.abs(arrays[0][a + k] - (arrays[1][b + k] || 0));
                }
              return { dy, mae: sum / (3 * points) };
            },
          );
          return {
            layerId: m.layerId,
            family: m.family,
            text: m.text,
            bounds: { browser: bounds[0], native: bounds[1] },
            offsetDiagnostics: offsets,
            bestDy: offsets.reduce((a, b) => (a.mae <= b.mae ? a : b)).dy,
          };
        });
        return {
          circularPixels: count,
          rgbMeanAbsoluteError: err / (3 * count),
          foregroundThreshold: 80,
          foregroundPixels: fg,
          foregroundRgbMeanAbsoluteError: fgErr / (3 * fg),
          rows,
          aod: r.aod
            ? {
                browser: window.gfcMoonFixture.analyzeAodPixels(
                  arrays[0],
                  n,
                  n,
                  r.target,
                  "browser-estimate",
                  "aod",
                ),
                native: window.gfcMoonFixture.analyzeAodPixels(
                  arrays[1],
                  n,
                  n,
                  r.target,
                  "native-frame",
                  "aod",
                ),
              }
            : undefined,
        };
      },
      { urls, r },
    );
    records.push({ ...r, pixels });
  }
  const report = {
    note: "Original unmodified images. Foreground threshold80 is diagnostic, separate from AOD lit-pixel counting. Offset search does not shift saved images. Fixed drawing cases, no real Sleep/hardware or model calls.",
    records,
  };
  await writeFile(
    path.join(dir, "comparison.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      records.map((r) => ({
        id: r.id,
        mae: r.pixels.rgbMeanAbsoluteError,
        foregroundMae: r.pixels.foregroundRgbMeanAbsoluteError,
        rows: r.pixels.rows.map((x) => ({
          id: x.layerId,
          bounds: x.bounds,
          bestDy: x.bestDy,
        })),
        aod: r.pixels.aod,
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
