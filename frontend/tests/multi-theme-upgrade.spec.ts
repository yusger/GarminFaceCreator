import {
  multiThemeFixture as fixture,
  themeDefinition as definition,
} from "./fixtures/multiThemeFixture";
import { build } from "vite";
import { test, expect } from "@playwright/test";
import { themedFixture } from "./fixtures/themedFixture";
import { typographyFixture } from "./fixtures/bitmapTypographyFixture";
import { fontPatch } from "../src/fontLibrary";
import { bitmapLayerPatch } from "../src/bitmapFontLayout";
import {
  enableDevices,
  addDevice,
  selectDevice,
  reconcileDevices,
  projectForDevice,
} from "../src/multiDevice";
import { devices } from "../src/devices";
import {
  upgradeThemeDefinition,
  applyCheckedThemeUpgrade,
  themeUpgradeBase,
} from "../src/themeUpgrade";
import { editorFrame, restoreEditorFrame } from "../src/editorHistory";
import { validateProject, type Project } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { bitmapFontDiagnostics } from "../src/bitmapFonts";
import { readFile } from "node:fs/promises";
const small = "venu441mm:41mm",
  large = "venu445mm:45mm";

test("multi-device definition upgrade preserves variant fonts, geometry, settings and application identity", async () => {
  const p = await fixture(),
    before = JSON.stringify(p),
    n = upgradeThemeDefinition(p, definition(p)).project;
  expect(n.id).toBe(p.id);
  expect(n.appId).toBe(p.appId);
  expect(n.multiDevice!.variants.map((v) => v.key)).toEqual([large, small]);
  const a = projectForDevice(n, large),
    b = projectForDevice(n, small);
  expect(a.layers[0].y).toBe(180);
  expect(a.layers[0].customFont!.id).toBe("sonar_label_font");
  expect(b.layers[0].x).toBe(123);
  expect(b.layers[0].bitmapFontId).toBe(p.bitmapFonts![0].id);
  expect(b.layers[0].customFont).toBeUndefined();
  expect(b.layers[0].y).toBe(180);
  expect(n.controlValues!["apex-color"]).toBe("#123456");
  expect(n.bitmapFonts).toHaveLength(1);
  expect(bitmapFontDiagnostics(b)).toEqual([]);
  for (const q of [a, b]) expect(() => localGenerate(q)).not.toThrow();
  expect(() => validateProject(n)).not.toThrow();
  expect(JSON.stringify(p)).toBe(before);
});
test("removed or reassigned layers discard incompatible device overrides with diagnostics", async () => {
  const p = await fixture(),
    d = definition(p),
    id = d.layers[0].id;
  d.layers[0].kind = "text";
  d.layers[0].text = "TEST";
  const result = upgradeThemeDefinition(p, d);
  expect(result.warnings.join(" ")).toContain(id);
  expect(
    result.project.multiDevice!.variants.find((v) => v.key === small)!
      .overrides[id],
  ).toBeUndefined();
  expect(result.project.bitmapFonts).toHaveLength(0);
});
test("incoming device defaults fill untouched properties while user overrides and installed target list prevail", async () => {
  const p = await fixture();
  let d = enableDevices(definition(p));
  d = addDevice(
    d,
    devices.find((d) => d.id === "venu441mm")!,
  );
  d = reconcileDevices(d, {
    ...d,
    layers: d.layers.map((l, i) => (i ? l : { ...l, x: 90, y: 210 })),
    revision: d.revision + 1,
  })!;
  const result = upgradeThemeDefinition(p, d).project,
    b = projectForDevice(result, small);
  expect(b.layers[0].x).toBe(123);
  expect(b.layers[0].y).toBe(210);
  expect(result.multiDevice!.scope).toBe(p.multiDevice!.scope);
  expect(() => validateProject(result)).not.toThrow();
});
test("checked multi-device design merges newer code metadata but intervening variant edits invalidate it", async () => {
  const p = await fixture(),
    checked = upgradeThemeDefinition(p, definition(p));
  const current = structuredClone(p);
  current.name = "New name";
  current.files = [{ path: "source/App.mc", content: "// latest root code" }];
  current.multiDevice!.variants.forEach((v) => {
    v.code.files = [{ path: "source/App.mc", content: "// latest " + v.key }];
    v.code.codeRevision = v.revision;
  });
  expect(themeUpgradeBase(current)).toBe(themeUpgradeBase(p));
  const next = applyCheckedThemeUpgrade(current, checked);
  expect(next.name).toBe("New name");
  expect(next.files).toEqual(current.files);
  for (const v of next.multiDevice!.variants) {
    expect(v.code.files[0].content).toBe("// latest " + v.key);
    expect(v.code.codeRevision).toBe(-1);
  }
  current.multiDevice!.variants.find((v) => v.key === large)!.overrides[
    p.layers[0].id
  ] = { y: 222 };
  expect(() => applyCheckedThemeUpgrade(current, checked)).toThrow(/重新检查/);
});
test("undo restores complete adaptation design, resources and scope without restoring fresh code", async () => {
  const p = await fixture(),
    frame = editorFrame(p),
    next = upgradeThemeDefinition(p, definition(p)).project;
  next.multiDevice!.variants.forEach(
    (v) =>
      (v.code.files = [{ path: "source/App.mc", content: "// newer source" }]),
  );
  const undone = restoreEditorFrame(next, frame);
  expect(undone.layers).toEqual(p.layers);
  expect(undone.bitmapFonts).toEqual(p.bitmapFonts);
  expect(undone.multiDevice!.master).toEqual(p.multiDevice!.master);
  expect(undone.multiDevice!.variants.map((v) => v.overrides)).toEqual(
    p.multiDevice!.variants.map((v) => v.overrides),
  );
  expect(
    undone.multiDevice!.variants.every(
      (v) =>
        v.code.files[0].content === "// newer source" &&
        v.code.codeRevision === -1,
    ),
  ).toBe(true);
  expect(() => validateProject(undone)).not.toThrow();
  const previous = p.layers.map((l) => ({ ...l, x: l.x + 1 })),
    grouped = editorFrame(p, previous),
    restored = restoreEditorFrame(p, grouped);
  expect(restored.layers).toEqual(previous);
  expect(() => validateProject(restored)).not.toThrow();
});
test("mismatched single-target updates and incompatible resources fail atomically", async () => {
  const p = await fixture(),
    before = JSON.stringify(p),
    d = definition(p);
  d.target = "venu445mm";
  d.deviceSize = "45mm";
  expect(() => upgradeThemeDefinition(p, d)).toThrow(/型号和尺寸/);
  expect(JSON.stringify(p)).toBe(before);
});

test("113 multi-device theme upgrade can apply, undo, redo and reload both target designs", async ({
  page,
}) => {
  const p = await fixture(),
    d = definition(p);
  await page.goto("/");
  await page.evaluate(
    (v) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("garmin-face-creator", 2);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("projects", "readwrite");
          t.objectStore("projects").put(v);
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
    .getByRole("button", { name: "打开 MultiTheme", exact: true })
    .click();
  await page.getByText("表盘配置", { exact: true }).click();
  await page.getByText("更新主题定义", { exact: true }).click();
  await page
    .getByLabel("检查主题更新", { exact: true })
    .setInputFiles({
      name: "update.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(d)),
    });
  await page.getByRole("button", { name: "应用主题更新", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const dump = async () => {
    const wait = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出项目", exact: true }).click();
    return JSON.parse(await readFile((await (await wait).path())!, "utf8"));
  };
  expect((await dump()).multiDevice.master[0].y).toBe(180);
  await page.getByText("表盘配置", { exact: true }).click();
  await page.getByTitle("撤销", { exact: true }).click();
  expect((await dump()).multiDevice.master[0].y).toBe(
    p.multiDevice!.master[0].y,
  );
  await page.getByTitle("重做", { exact: true }).click();
  let saved = await dump();
  expect(saved.multiDevice.master[0].y).toBe(180);
  expect(
    saved.multiDevice.variants.find((v: any) => v.key === small).overrides[
      p.layers[0].id
    ].bitmapFontId,
  ).toBe(p.bitmapFonts![0].id);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 MultiTheme", exact: true })
    .click();
  saved = await dump();
  expect(saved.multiDevice.master[0].y).toBe(180);
  expect(saved.layers[0].x).toBe(123);
});

test("explicit device system font stays independent when the new default introduces bitmap fonts", async () => {
  let p = await fixture();
  p = reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l, i) =>
      i
        ? l
        : {
            ...l,
            bitmapFontId: undefined,
            bitmapTracking: undefined,
            bitmapTabular: undefined,
            bitmapBaselineShift: undefined,
            bitmapLineHeight: undefined,
            customFont: undefined,
            garminFont: "small",
          },
    ),
    revision: p.revision + 1,
  })!;
  let d = enableDevices(definition(p));
  d.bitmapFonts = p.bitmapFonts;
  d = addDevice(
    d,
    devices.find((d) => d.id === "venu441mm")!,
  );
  d = reconcileDevices(d, {
    ...d,
    layers: d.layers.map((l, i) =>
      i
        ? l
        : {
            ...l,
            ...bitmapLayerPatch(d, d.bitmapFonts![0].id),
            bitmapTracking: 2,
          },
    ),
    revision: d.revision + 1,
  })!;
  const n = upgradeThemeDefinition(p, d).project,
    q = projectForDevice(n, small);
  expect(q.layers[0].garminFont).toBe("small");
  expect(q.layers[0].bitmapFontId).toBeUndefined();
  expect(q.layers[0].bitmapTracking).toBeUndefined();
  expect(() => validateProject(n)).not.toThrow();
});
for (const key of [large, small])
  test("upgraded multi-device theme SDK " + key, async ({ page, request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK check");
    test.setTimeout(150000);
    const bundle = await build({
      configFile: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        write: false,
        minify: false,
        lib: {
          entry: "frontend/tests/fixtures/multiThemeHarness.ts",
          name: "GfcMultiThemeHarness",
          formats: ["iife"],
        },
      },
    });
    const entry = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(
      (f) => f.type === "chunk" && f.isEntry,
    )!;
    await page.goto("/");
    await page.addScriptTag({ content: entry.code });
    const result = await page.evaluate(async (key) => {
      const h = (window as any).gfcMultiTheme,
        p = h.projectForDevice(await h.fixture(), key);
      p.files = h.localGenerate(p);
      const form = new FormData();
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
      const r = await fetch("/api/builds", { method: "POST", body: form });
      return { status: r.status, body: await r.json() };
    }, key);
    expect(result.status, JSON.stringify(result.body)).toBe(202);
    const job = result.body,
      headers = { Authorization: "Bearer " + job.accessToken };
    await expect
      .poll(
        async () => {
          const r = await request.get("/api/builds/" + job.buildId, {
            headers,
          });
          expect(r.ok()).toBe(true);
          const s = await r.json();
          if (s.status === "failed")
            throw Error(
              await (
                await request.get("/api/builds/" + job.buildId + "/logs", {
                  headers,
                })
              ).text(),
            );
          return s.status;
        },
        { timeout: 130000, intervals: [1000] },
      )
      .toBe("succeeded");
  });
