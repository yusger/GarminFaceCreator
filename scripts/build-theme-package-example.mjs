// Generates the original contract example from actual browser captures. Not a default watchface.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "vite";
import { chromium } from "@playwright/test";
import { themePackageFixture } from "../frontend/tests/fixtures/themePackageFixture.ts";
import { projectForDevice, deviceKey } from "../frontend/src/multiDevice.ts";
import { resolveControls } from "../frontend/src/projectControls.ts";
import { reading, ink } from "../frontend/src/previewData.ts";
if (!process.env.GFC_TEST_URL) throw Error("Set authorized GFC_TEST_URL");
const dir = "resources/examples/theme-project-v1";
await mkdir(dir + "/previews", { recursive: true });
const p = themePackageFixture();
await writeFile(dir + "/design.json", JSON.stringify(p, null, 2) + "\n");
const cases = [];
for (const t of p.multiDevice.variants)
  for (const theme of p.themes.presets)
    for (const mode of ["active", "aod"])
      for (const scenario of [
        "normal",
        "zero",
        "missing",
        "source",
        "threshold0",
        "threshold120",
        "threshold150",
      ]) {
        const threshold = scenario.startsWith("threshold")
          ? Number(scenario.slice(9))
          : undefined;
        const data = {
          time: "09:41",
          calendarDate: "2026-11-28",
          utcOffsetMinutes: 480,
          missing: scenario === "missing",
          values: {
            heartRate: threshold ?? (scenario === "zero" ? 0 : 72),
            battery: scenario === "zero" ? 0 : 78,
          },
        };
        const q = projectForDevice(p, deviceKey(t));
        q.themes.activeId = theme.id;
        const controlValues =
          scenario === "source" ? { [theme.id + "-source"]: "battery" } : {};
        q.controlValues = controlValues;
        const visible = resolveControls(q).layers.filter(
          (l) =>
            !l.hidden && (mode === "aod" ? l.aod : l.activeVisible !== false),
        );
        const preview = {
          ...data,
          heartRate: NaN,
          steps: NaN,
          battery: NaN,
          seconds: 0,
        };
        cases.push({
          id: theme.id + "-" + t.target + "-" + mode + "-" + scenario,
          themeId: theme.id,
          target: t.target,
          mode,
          scenario: threshold !== undefined ? "threshold" : scenario,
          data,
          controlValues,
          expect: {
            colors: Object.fromEntries(
              visible
                .filter((l) => ["metric", "meter"].includes(l.kind))
                .map((l) => [l.id, ink(l, preview)]),
            ),
            visibleLayerIds: visible.map((l) => l.id),
            readings: Object.fromEntries(
              visible
                .filter((l) =>
                  ["text", "time", "date", "metric"].includes(l.kind),
                )
                .map((l) => [l.id, reading(l, preview)]),
            ),
          },
        });
      }
await writeFile(
  dir + "/cases.json",
  JSON.stringify(
    { format: "gfc-theme-project-cases", formatVersion: 1, cases },
    null,
    2,
  ) + "\n",
);
await writeFile(
  dir + "/LICENSE.txt",
  'Copyright 2026 GarminFaceCreator contributors\nThis original sample design is licensed under the MIT License.\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n',
);
const b = await build({
  configFile: false,
  logLevel: "silent",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: "frontend/tests/fixtures/visualKitHarness.ts",
      name: "GfcVisualKitFixture",
      formats: ["iife"],
    },
  },
});
const code = (Array.isArray(b) ? b[0] : b).output.find(
  (f) => f.type === "chunk" && f.isEntry,
).code;
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  headless: true,
});
const previews = [];
try {
  const page = await browser.newPage();
  await page.goto(process.env.GFC_TEST_URL);
  await page.addScriptTag({ content: code });
  for (const t of p.multiDevice.variants)
    for (const theme of p.themes.presets)
      for (const mode of ["active", "aod"]) {
        const q = projectForDevice(p, deviceKey(t));
        q.themes.activeId = theme.id;
        const result = await page.evaluate(
          async ({ q, mode }) =>
            window.gfcVisualKits.captureWatchface(
              q,
              {
                time: "09:41",
                calendarDate: "2026-11-28",
                utcOffsetMinutes: 480,
                heartRate: 72,
                steps: 4500,
                battery: 78,
                seconds: 0,
              },
              mode === "aod",
            ),
          { q, mode },
        );
        const file =
          "previews/" + theme.id + "-" + t.target + "-" + mode + ".png";
        await writeFile(
          dir + "/" + file,
          Buffer.from(result.data.split(",")[1], "base64"),
        );
        previews.push({ themeId: theme.id, target: t.target, mode, file });
      }
} finally {
  await browser.close();
}
const manifest = {
  format: "gfc-theme-project",
  formatVersion: 1,
  profile: "theme-project-v1",
  slug: "theme-contract-sample",
  version: "1.0.0",
  name: p.name,
  origin: {
    author: "GarminFaceCreator contributors",
    source: "https://github.com/yusger/GarminFaceCreator",
    license: "MIT",
    noticeFile: "LICENSE.txt",
  },
  targets: p.multiDevice.variants.map(({ target, deviceSize }) => ({
    target,
    deviceSize,
  })),
  previews,
  images: [],
  fonts: [],
  files: [],
};
for (const [path, role] of [
  ["design.json", "design"],
  ["cases.json", "cases"],
  ["LICENSE.txt", "notice"],
  ...previews.map((p) => [p.file, "preview"]),
]) {
  const bytes = await readFile(dir + "/" + path);
  manifest.files.push({
    path,
    role,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  dir + "/publish.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Generated actual browser sample matrix (12 images)");
