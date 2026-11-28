import { applyChat, chatFields } from "../src/designChat";
import { fontChoicePatch } from "../src/fontChoices";
import { enableDevices, addDevice } from "../src/multiDevice";
import { devices } from "../src/devices";
import { readFile } from "node:fs/promises";
import { build } from "vite";
import { test, expect } from "@playwright/test";
import { multiFontFixture } from "./fixtures/multiFontFixture";
import { typographyFixture } from "./fixtures/bitmapTypographyFixture";
import { validateProject } from "../src/domain";
import { migrateProject } from "../src/migrations";
import {
  selectDevice,
  projectForDevice,
  reconcileDevices,
} from "../src/multiDevice";
import { bitmapLayerPatch } from "../src/bitmapFontLayout";
import {
  bitmapFontDiagnostics,
  createBitmapFontAsset,
  usedBitmapFonts,
} from "../src/bitmapFonts";
import { localGenerate } from "../src/localGenerator";
const large = "venu445mm:45mm",
  small = "venu441mm:41mm";
test("device bitmap bindings and cleared TTF references persist as JSON without changing the master font", async () => {
  const p = await multiFontFixture(),
    id = p.layers[0].id,
    patch = p.multiDevice!.variants.find((v) => v.key === small)!.overrides[id];
  expect(patch.customFont).toBeNull();
  expect(patch.bitmapTabular).toBe(true);
  expect(p.layers[0].customFont).toBeUndefined();
  expect(p.multiDevice!.master[0].customFont!.id).toBe("sonar_label_font");
  const serialized = JSON.parse(JSON.stringify(p));
  expect(
    serialized.multiDevice.variants.find((v: any) => v.key === small).overrides[
      id
    ].customFont,
  ).toBeNull();
  validateProject(serialized);
  const restored = selectDevice(migrateProject(serialized), small, "device");
  expect(restored.layers[0].customFont).toBeUndefined();
  expect(restored.layers[0].bitmapFontId).toBe(p.bitmapFonts![1].id);
  expect(bitmapFontDiagnostics(restored)).toEqual([]);
  expect(projectForDevice(restored, large).layers[0].customFont!.id).toBe(
    "sonar_label_font",
  );
  const copy = validateProject(serialized);
  expect(copy.appId).not.toBe(p.appId);
  expect(projectForDevice(copy, small).layers[0].bitmapFontId).toBe(
    p.bitmapFonts![1].id,
  );
});
test("shared font changes preserve independent device glyphs and each target generates its own resources", async () => {
  const p = await multiFontFixture(),
    master = selectDevice(p, large, "master");
  const l = {
    ...master.layers[0],
    ...bitmapLayerPatch(master, master.bitmapFonts![0].id),
    bitmapTracking: 2,
  };
  const next = reconcileDevices(master, {
    ...master,
    layers: [l],
    revision: master.revision + 1,
  })!;
  const a = projectForDevice(next, large),
    b = projectForDevice(next, small);
  expect(a.layers[0].bitmapFontId).toBe(next.bitmapFonts![0].id);
  expect(b.layers[0].bitmapFontId).toBe(next.bitmapFonts![1].id);
  expect(a.layers[0].bitmapTracking).toBe(2);
  expect(b.layers[0].bitmapTracking).toBe(1);
  for (const target of [a, b]) {
    expect(bitmapFontDiagnostics(target)).toEqual([]);
    const code = localGenerate(target);
    expect(code.find((f) => f.path === "manifest.xml")!.content).toContain(
      target.target,
    );
    expect(usedBitmapFonts(target)).toHaveLength(1);
  }
});
test("invalid nullable geometry, foreign font references and malformed typography reject atomically", async () => {
  const p = await multiFontFixture(),
    before = JSON.stringify(p),
    id = p.layers[0].id;
  for (const patch of [
    { x: null },
    { customFont: { id: "foreign", family: "Other", file: "../other.ttf" } },
    { bitmapFontId: "bitmap_" + "f".repeat(32) },
    { bitmapTracking: 0.5 },
    { bitmapTabular: "true" },
    { fontWeight: 999 },
  ]) {
    const bad = structuredClone(p);
    Object.assign(
      bad.multiDevice!.variants.find((v) => v.key === small)!.overrides[id],
      patch,
    );
    expect(() => validateProject(bad)).toThrow();
  }
  expect(JSON.stringify(p)).toBe(before);
});
test("project may retain sixteen fonts for variants while a single target is limited to eight used fonts", async () => {
  const p = await typographyFixture(),
    f = p.bitmapFonts![0];
  p.bitmapFonts = Array.from({ length: 16 }, (_, i) =>
    createBitmapFontAsset(
      f.descriptor.replace(
        "GFC Synthetic Typography",
        "GFC Synthetic Typography " + i,
      ),
      f.atlasData,
      f.license,
    ),
  );
  p.layers = [{ ...p.layers[0], ...bitmapLayerPatch(p, p.bitmapFonts[0].id) }];
  expect(() => validateProject(p)).not.toThrow();
  expect(usedBitmapFonts(p)).toHaveLength(1);
  expect(bitmapFontDiagnostics(p)).toEqual([]);
  p.layers = Array.from({ length: 9 }, (_, i) => ({
    ...p.layers[0],
    id: "font-" + i,
    ...bitmapLayerPatch(p, p.bitmapFonts![i].id),
  }));
  expect(
    bitmapFontDiagnostics(p).some((x) => x.message.includes("最多使用8份")),
  ).toBe(true);
  expect(() => localGenerate(p)).toThrow(/8份/);
});

test("113 device font choice and typography persist, undo and remain isolated across target switches", async ({
  page,
}) => {
  const p = await multiFontFixture();
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
    .getByRole("button", { name: "打开 MultiFont", exact: true })
    .click();
  await page.locator(".layer-row").filter({ hasText: "Digits" }).click();
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await page
    .getByRole("button", {
      name: "应用位图GFC Synthetic Typography",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toHaveValue("0");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toHaveValue("1");
  await page.getByTitle("重做", { exact: true }).click();
  await expect(
    page.getByLabel("字距（目标像素）", { exact: true }),
  ).toHaveValue("0");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const dump = async () => {
    const d = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出项目", exact: true }).click();
    return JSON.parse(await readFile((await (await d).path())!, "utf8"));
  };
  let saved = await dump();
  expect(saved.schemaVersion).toBe(48);
  expect(saved.layers[0].bitmapFontId).toBe(p.bitmapFonts![0].id);
  expect(
    saved.multiDevice.variants.find((v: any) => v.key === small).overrides[
      p.layers[0].id
    ].customFont,
  ).toBeNull();
  await page.getByRole("button", { name: /^适配设备/ }).click();
  await page.getByLabel("适配预览设备", { exact: true }).selectOption(large);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  saved = await dump();
  expect(saved.layers[0].customFont.id).toBe("sonar_label_font");
  expect(saved.layers[0].bitmapFontId).toBeUndefined();
  await page.getByLabel("适配预览设备", { exact: true }).selectOption(small);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 MultiFont", exact: true })
    .click();
  saved = await dump();
  expect(saved.layers[0].bitmapFontId).toBe(p.bitmapFonts![0].id);
  expect(saved.layers[0].customFont).toBeUndefined();
});
for (const key of [large, small])
  test("device font override SDK " + key, async ({ page, request }) => {
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
          entry: "frontend/tests/fixtures/multiFontHarness.ts",
          name: "GfcMultiFontHarness",
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
      const h = (window as any).gfcMultiFonts,
        p = h.projectForDevice(await h.multiFontFixture(), key);
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

test("clearing inherited bitmap fonts and typography survives JSON null removal markers", async () => {
  let p = await typographyFixture();
  p.layers = [
    {
      ...p.layers[0],
      bitmapTracking: 2,
      bitmapTabular: true,
      bitmapBaselineShift: 3,
      bitmapLineHeight: 16,
    },
  ];
  p = addDevice(
    enableDevices(p),
    devices.find((d) => d.id === "venu441mm")!,
  );
  const next = reconcileDevices(p, {
    ...p,
    layers: [
      { ...p.layers[0], ...fontChoicePatch(p, p.layers[0], "system:small") },
    ],
    revision: p.revision + 1,
  })!;
  const patch = next.multiDevice!.variants.find((v) => v.key === small)!
    .overrides[next.layers[0].id];
  expect(patch.bitmapFontId).toBeNull();
  expect(patch.bitmapTracking).toBeNull();
  expect(patch.bitmapTabular).toBeNull();
  const restored = migrateProject(JSON.parse(JSON.stringify(next)));
  validateProject(restored);
  const little = projectForDevice(restored, small);
  expect(little.layers[0].garminFont).toBe("small");
  expect(little.layers[0].bitmapFontId).toBeUndefined();
  expect(little.layers[0].bitmapTracking).toBeUndefined();
  expect(bitmapFontDiagnostics(little)).toEqual([]);
  expect(projectForDevice(restored, large).layers[0].bitmapFontId).toBe(
    p.bitmapFonts![0].id,
  );
});
test("Schema47 migration preserves shared design, application identity and original font assets", async () => {
  const p = await typographyFixture();
  p.schemaVersion = 47;
  const before = JSON.stringify(p),
    n = migrateProject(p);
  expect(n.schemaVersion).toBe(48);
  expect(n.id).toBe(p.id);
  expect(n.appId).toBe(p.appId);
  expect(n.layers).toEqual(p.layers);
  expect(n.bitmapFonts).toEqual(p.bitmapFonts);
  expect(JSON.stringify(p)).toBe(before);
});

test("creation-only virtual font and icon fields never enter chat layer updates", async () => {
  const p = await typographyFixture();
  expect(chatFields).not.toContain("fontId");
  expect(chatFields).not.toContain("iconId");
  const before = JSON.stringify(p);
  for (const field of ["fontId", "iconId"])
    for (const value of ["unapproved", 1])
      expect(() =>
        applyChat(
          p,
          JSON.stringify({
            message: "Test",
            operations: [
              { type: "update", id: p.layers[0].id, patch: { [field]: value } },
            ],
          }),
        ),
      ).toThrow();
  expect(JSON.stringify(p)).toBe(before);
});
