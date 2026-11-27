import { build } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
if (process.env.GFC_NATIVE_FIXTURE_TEST !== "1" || !process.env.GFC_TEST_URL)
  throw Error("Set GFC_NATIVE_FIXTURE_TEST=1 and authorized GFC_TEST_URL");
const url = new URL(process.env.GFC_TEST_URL);
if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
  throw Error("Invalid staging URL");
const converted = process.argv.includes("--converted");
if (process.argv.slice(2).some((a) => a !== "--converted"))
  throw Error("Unknown capture option");
const output = path.resolve(
  "Temp/native-bitmap-typography-" +
    (converted ? "converted-" : "") +
    Date.now(),
);
await mkdir(output, { recursive: true });
const bundled = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: "frontend/tests/fixtures/bitmapTypographyNativeHarness.ts",
        name: "GfcBitmapTypographyFixture",
        formats: ["iife"],
      },
    },
  }),
  entry = (Array.isArray(bundled) ? bundled[0] : bundled).output.find(
    (f) => f.type === "chunk" && f.isEntry,
  );
if (!entry) throw Error("Missing fixture harness");
const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  }),
  records = [];
try {
  const page = await browser.newPage();
  await page.goto(url.href);
  await page.addScriptTag({ content: entry.code });
  for (const c of [
    { id: "active-454", target: "venu445mm", aod: false, converted },
    { id: "active-390", target: "venu441mm", aod: false, converted },
    { id: "forced-aod-454", target: "venu445mm", aod: true, converted },
  ]) {
    const dir = path.join(output, c.id);
    await mkdir(dir, { recursive: true });
    const result = await page.evaluate(async (c) => {
      const h = window.gfcBitmapTypography,
        fixture = await h.fixture(c.target, c.aod, c.converted),
        p = fixture.p,
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
      for (const f of await h.preparedCodeFiles(p))
        form.append("files", new Blob([f.content]), f.path);
      for (const a of await h.preparedAssets(p))
        form.append("files", await (await fetch(a.data)).blob(), a.path);
      const response = await fetch("/api/builds", {
        method: "POST",
        body: form,
      });
      return {
        status: response.status,
        job: await response.json(),
        browser: fixture.browser,
        metrics: fixture.metrics,
        aodAnalysis: fixture.aodAnalysis,
        warnings: fixture.warnings,
        files: p.files,
      };
    }, c);
    if (result.status !== 202)
      throw Error(
        "Build rejected " + result.status + JSON.stringify(result.job),
      );
    await writeFile(
      path.join(dir, "browser.png"),
      Buffer.from(result.browser.split(",")[1], "base64"),
    );
    await writeFile(
      path.join(dir, "source.json"),
      JSON.stringify(result.files, null, 2),
    );
    const root = new URL("/api/builds/" + result.job.buildId, url).href,
      headers = { Authorization: "Bearer " + result.job.accessToken },
      get = async (suffix) => {
        const r = await fetch(root + suffix, { headers });
        if (!r.ok) throw Error("Protected resource failed " + r.status);
        return r;
      },
      poll = async (suffix) => {
        for (let i = 0; i < 90; i++) {
          const state = await (await get(suffix)).json();
          if (["failed", "succeeded", "cancelled"].includes(state.status))
            return state;
          await new Promise((r) => setTimeout(r, 1500));
        }
        throw Error("Fixture timeout");
      };
    const compiled = await poll(""),
      logs = await (await get("/logs")).json();
    await writeFile(
      path.join(dir, "compile.json"),
      JSON.stringify({ state: compiled, logs }, null, 2),
    );
    if (compiled.status !== "succeeded")
      throw Error("SDK failed " + c.id + JSON.stringify(logs));
    const submit = await fetch(root + "/native-verification", {
      method: "POST",
      headers,
    });
    if (submit.status !== 202)
      throw Error("Native rejected " + submit.status + (await submit.text()));
    const native = await poll("/native-verification");
    await writeFile(
      path.join(dir, "native-original.json"),
      JSON.stringify(native, null, 2),
    );
    if (
      native.status !== "succeeded" ||
      native.report?.cleanupStatus !== "completed" ||
      !native.report.logs.includes("GFC_CONTROLLED_BITMAP_TYPOGRAPHY")
    )
      throw Error(
        "Native failed " +
          JSON.stringify({ status: native.status, error: native.error }),
      );
    const samples = new Map(
      [
        ...native.report.logs.matchAll(
          /GFC_BITMAP_LAYOUT (bitmap_[a-f0-9]{32}) ([0-9:]+) (-?\d+) (-?\d+) (-?\d+)/g,
        ),
      ].map((m) => [
        m[1] + m[2],
        { width: Number(m[3]), left: Number(m[4]), top: Number(m[5]) },
      ]),
    );
    const comparisons = result.metrics.map((m) => {
      const actual = samples.get(m.fontId + m.text);
      if (!actual) throw Error("Missing actual native metric " + m.layerId);
      for (const k of ["width", "left", "top"])
        if (m[k] !== actual[k])
          throw Error(
            "Native metric mismatch " +
              m.layerId +
              " " +
              k +
              ": " +
              m[k] +
              " vs " +
              actual[k],
          );
      return { ...m, native: actual };
    });
    await writeFile(
      path.join(dir, "native.png"),
      Buffer.from(
        await (
          await get("/native-verification/artifacts/screen.png")
        ).arrayBuffer(),
      ),
    );
    records.push({
      ...c,
      applicationDataMode:
        "controlled drawing fixture, licensed fonts and fixed text; physical tracking, tabular advances, baseline shifts and line heights",
      sleepTransition: "unverified; forced AOD is a drawing case",
      metrics: comparisons,
      browserAodAnalysis: result.aodAnalysis,
      warnings: result.warnings,
      sdk: native.report.sdkVersion,
      generator: native.generatorVersion,
      width: native.report.width,
      height: native.report.height,
      cleanup: native.report.cleanupStatus,
      sourceSha256: native.sourceSha256,
      prgSha256: native.prgSha256,
      workerDataMode: native.report.dataMode,
    });
    await writeFile(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          note: "No hardware or real Sleep acceptance; no model calls",
          records,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        id: c.id,
        compile: compiled.status,
        native: native.status,
        verifiedTextRuns: comparisons.length,
        physicalMetrics: "exact integer match",
        output,
      }),
    );
  }
} finally {
  await browser.close();
}
