import { chromium } from "@playwright/test";
import * as fs from "node:fs/promises";
import { build } from "vite";
if (process.env.GFC_NATIVE_FIXTURE_TEST !== "1" || !process.env.GFC_TEST_URL)
  throw Error(
    "Set GFC_NATIVE_FIXTURE_TEST=1 and explicit staging GFC_TEST_URL",
  );
const url = new URL(process.env.GFC_TEST_URL);
if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
  throw Error("Invalid staging URL");
const bundled = await build({
  configFile: false,
  logLevel: "silent",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: "frontend/tests/fixtures/bitmapFontHarness.ts",
      name: "GfcBitmapFixture",
      formats: ["iife"],
    },
  },
});
const entry = (Array.isArray(bundled) ? bundled[0] : bundled).output.find(
  (f) => f.type === "chunk" && f.isEntry,
);
if (!entry) throw Error("Missing harness");
(async () => {
  const dir = "Temp/native-bitmap-font-fixtures";
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(url.href);
    await page.addScriptTag({ content: entry.code });
    for (const target of ["venu445mm", "venu441mm"]) {
      const result = await page.evaluate(async (target) => {
        const h = window.gfcBitmapHarness,
          p = h.project("BitmapStyles", true);
        p.target = target;
        p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
        p.backgroundColor = "#101820";
        p.layers = [];
        p.bitmapFonts = [];
        const scale = (target === "venu445mm" ? 454 : 390) / 454;
        for (const [i, id] of [
          "sonar_label_font",
          "sonar_number_font",
          "chalk",
        ].entries()) {
          const font = h.libraryFonts.find((f) => f.id === id),
            bytes = await (await fetch("/fonts/" + font.file)).arrayBuffer(),
            license = await (
              await fetch(
                "/fonts/" + font.file.replace(/\.ttf$/, "-LICENSE.txt"),
              )
            ).text(),
            size = Math.round([38, 42, 34][i] * scale),
            atlas = await h.chalkAtlas(
              bytes,
              "Bitmap" + i,
              size,
              "0123456789:AV ",
              "atlas.png",
            );
          let desc = atlas.content;
          if (i === 0)
            desc +=
              "kernings count=2\nkerning first=65 second=86 amount=-3\nkerning first=86 second=65 amount=-2\n";
          const asset = h.createBitmapFontAsset(
            desc,
            atlas.data,
            license,
            "Licensed library " + font.file,
          );
          p.bitmapFonts.push(asset);
          p.layers.push({
            ...h.layer("text"),
            id: "font" + i,
            name: font.family,
            text:
              i === 0 ? "AVAVA 09:41" : i === 1 ? "012345 12:30" : "09:41 5678",
            x: 50,
            y: 100 + i * 85,
            w: 354,
            h: 65,
            color: ["#55ccee", "#ffcc66", "#e6eef8"][i],
            ...h.bitmapLayerPatch(p, asset.id),
          });
        }
        if (h.bitmapFontDiagnostics(p).length)
          throw Error(JSON.stringify(h.bitmapFontDiagnostics(p)));
        p.files = h.localGenerate(p);
        const files = await h.preparedCodeFiles(p),
          assets = await h.preparedAssets(p),
          form = new FormData();
        form.append(
          "project",
          JSON.stringify({
            projectId: p.id,
            projectName: p.name,
            target: p.target,
            appId: p.appId,
            revision: p.revision,
          }),
        );
        for (const f of files)
          form.append("files", new Blob([f.content]), f.path);
        for (const a of assets)
          form.append("files", await (await fetch(a.data)).blob(), a.path);
        const r = await fetch("/api/builds", { method: "POST", body: form }),
          shot = await h.captureWatchface(p, {
            time: "09:41",
            seconds: 0,
            calendarDate: "2026-11-28",
            heartRate: 80,
            steps: 4500,
            battery: 50,
          });
        return {
          status: r.status,
          job: await r.json(),
          source: files.filter((f) => f.path.endsWith(".mc")),
          browser: shot.data,
          warnings: shot.warnings,
          fonts: p.bitmapFonts.map((f) => ({ id: f.id, family: f.family })),
        };
      }, target);
      await fs.writeFile(
        dir + "/" + target + "-source.json",
        JSON.stringify(result.source, null, 2),
      );
      await fs.writeFile(
        dir + "/" + target + "-browser.png",
        Buffer.from(result.browser.split(",")[1], "base64"),
      );
      if (result.status !== 202) throw Error(JSON.stringify(result.job));
      const headers = { Authorization: "Bearer " + result.job.accessToken },
        root = new URL("/api/builds/" + result.job.buildId, url).href,
        poll = async (url) => {
          for (let i = 0; i < 100; i++) {
            const r = await fetch(url, { headers }),
              s = await r.json();
            if (["succeeded", "failed", "cancelled"].includes(s.status))
              return s;
            await new Promise((r) => setTimeout(r, 1500));
          }
          throw Error("Timeout");
        };
      const state = await poll(root),
        logs = await (await fetch(root + "/logs", { headers })).json();
      await fs.writeFile(
        dir + "/" + target + "-build.json",
        JSON.stringify({ state, logs }, null, 2),
      );
      console.log(
        JSON.stringify({
          target,
          compile: state.status,
          errors: logs.lines.filter((l) => l.includes("ERROR")),
        }),
      );
      if (state.status !== "succeeded") throw Error("Compilation failed");
      const r = await fetch(root + "/native-verification", {
        method: "POST",
        headers,
      });
      if (r.status !== 202) throw Error(await r.text());
      const native = await poll(root + "/native-verification");
      await fs.writeFile(
        dir + "/" + target + "-native.json",
        JSON.stringify(native, null, 2),
      );
      console.log(
        JSON.stringify({
          target,
          native: native.status,
          error: native.error,
          cleanup: native.report?.cleanupStatus,
        }),
      );
      if (native.status !== "succeeded") throw Error("Native failed");
      const a = await fetch(
        root + "/native-verification/artifacts/screen.png",
        { headers },
      );
      await fs.writeFile(
        dir + "/" + target + "-native.png",
        Buffer.from(await a.arrayBuffer()),
      );
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exitCode = 1;
});
