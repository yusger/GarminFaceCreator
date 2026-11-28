import { build } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
if (!process.env.GFC_TEST_URL) throw Error("Set authorized GFC_TEST_URL");
const update = process.argv.slice(2).join(" ") === "--update-previews";
if (process.argv.length > 2 && !update)
  throw Error("Only --update-previews accepted");
const output = path.resolve("Temp/visual-kits-" + Date.now());
await mkdir(output, { recursive: true });
const bundle = await build({
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
const entry = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(
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
  const records = [];
  for (const id of ["kit-instrument", "kit-activity", "kit-minimal"])
    for (const target of ["venu445mm", "venu441mm"])
      for (const aod of [false, true]) {
        const capture = await page.evaluate(
          async ({ id, target, aod }) => {
            const h = window.gfcVisualKits;
            return h.captureWatchface(h.fixture(id, target), h.preview, aod);
          },
          { id, target, aod },
        );
        const name = id + "-" + target + "-" + (aod ? "aod" : "active");
        await writeFile(
          path.join(output, name + ".png"),
          Buffer.from(capture.data.split(",")[1], "base64"),
        );
        const { data, ...metadata } = capture;
        records.push({ id, target, ...metadata });
        if (update && target === "venu445mm")
          await writeFile(
            path.join(
              "resources/default-watchfaces-template",
              id,
              aod ? "preview-aod.svg" : "preview.svg",
            ),
            `<svg xmlns="http://www.w3.org/2000/svg" width="454" height="454" viewBox="0 0 454 454"><title>${id} · actual browser capture, fixed demonstration data</title><image width="454" height="454" href="${data}"/></svg>\n`,
          );
      }
  await writeFile(
    path.join(output, "captures.json"),
    JSON.stringify(records, null, 2),
  );
  console.log("Visual kit captures: " + output);
} finally {
  await browser.close();
}
