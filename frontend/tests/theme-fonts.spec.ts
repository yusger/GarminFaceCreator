import {copyReference} from "../src/builtins";
﻿import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { build } from "vite";
import { validateProject } from "../src/domain";
import {
  bitmapFontInfo,
  bitmapFontDiagnostics,
  usedBitmapFonts,
  createBitmapFontAsset,
} from "../src/bitmapFonts";
import { bitmapLayerPatch } from "../src/bitmapFontLayout";
import { projectForDevice, deviceKey } from "../src/multiDevice";
import { typographyFixture } from "./fixtures/bitmapTypographyFixture";
import { localGenerate } from "../src/localGenerator";
async function raw() {
  return JSON.parse(
    await readFile("resources/default-watchfaces/trail/design.json", "utf8"),
  );
}
test("trail retains one identity and two precise targets under the byte and frame font budgets", async () => {
  const p = await raw();
  expect(() => validateProject(p)).not.toThrow();
  expect(p.bitmapFonts).toHaveLength(28);
  expect(p.fontRoles).toHaveLength(27);
  expect(p.localFonts).toHaveLength(2);
  expect(p.controls).toHaveLength(37);
  expect(p.multiDevice.variants).toHaveLength(2);
  expect(
    p.bitmapFonts.reduce(
      (n, f) => n + Buffer.from(f.atlasData.split(",")[1], "base64").length,
      0,
    ),
  ).toBeLessThan(65536);
  for (const v of p.multiDevice.variants) {
    const q = projectForDevice(p, v.key);
    expect(usedBitmapFonts(q)).toHaveLength(14);
    expect(bitmapFontDiagnostics(q)).toEqual([]);
    expect(
      localGenerate(q).some((f) => f.path === "source/GfcBitmapText.mc"),
    ).toBe(true);
  }
  expect(
    p.layers.some(
      (l) => l.activeVisible === false && l.bitmapFontId && l.size === 130,
    ),
  ).toBe(true);
});
test("multi-theme font budget counts possible fonts in each mode and preserves ordinary target cap", async () => {
  const p = await typographyFixture(),
    f = p.bitmapFonts![0];
  p.bitmapFonts = Array.from({ length: 17 }, (_, i) =>
    createBitmapFontAsset(
      f.descriptor.replace(
        "GFC Synthetic Typography",
        "GFC Synthetic Typography " + i,
      ),
      f.atlasData,
      f.license,
    ),
  );
  p.layers = Array.from({ length: 9 }, (_, i) => ({
    ...p.layers[0],
    id: "glyph-" + i,
    ...bitmapLayerPatch(p, p.bitmapFonts![i].id),
  }));
  expect(
    bitmapFontDiagnostics(p).some((d) => d.message.includes("最多使用8份")),
  ).toBe(true);
  p.themes = {
    version: 1,
    activeId: "a",
    defaultId: "a",
    presets: [
      {
        id: "a",
        name: "A",
        version: "1.0.0",
        backgroundColor: "#000000",
        layerIds: p.layers.slice(0, 5).map((l) => l.id),
        controlIds: [],
      },
      {
        id: "b",
        name: "B",
        version: "1.0.0",
        backgroundColor: "#000000",
        layerIds: p.layers.slice(5).map((l) => l.id),
        controlIds: [],
      },
    ],
  };
  expect(bitmapFontDiagnostics(p)).toEqual([]);
  p.themes.presets[0].layerIds = p.layers.map((l) => l.id);
  p.themes.presets[1].layerIds = [];
  expect(
    bitmapFontDiagnostics(p).some((d) => d.message.includes("每帧最多使用8份")),
  ).toBe(true);
  p.layers = Array.from({ length: 17 }, (_, i) => ({
    ...p.layers[0],
    id: "glyph-" + i,
    ...bitmapLayerPatch(p, p.bitmapFonts![i].id),
  }));
  p.themes.presets[0].layerIds = p.layers.slice(0, 8).map((l) => l.id);
  p.themes.presets[1].layerIds = p.layers.slice(8).map((l) => l.id);
  expect(
    bitmapFontDiagnostics(p).some((d) => d.message.includes("最多使用16份")),
  ).toBe(true);
});
test("113 multi-device trail bundle hydrates image bytes into both master and current layers", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "使用 trail", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await wait).path())!, "utf8"),
  );
  expect(saved.bitmapFonts).toHaveLength(28);
  for (const l of saved.layers.filter((l) => l.kind === "image"))
    expect(l.image).toMatch(/^data:image\/png;base64,/);
  for (const l of saved.multiDevice.master.filter((l) => l.kind === "image"))
    expect(l.image).toMatch(/^data:image\/png;base64,/);
  expect(() => validateProject(saved)).not.toThrow();
  await page.getByText("表盘配置", { exact: true }).click();
  for (const theme of ["apex", "trail", "vital"])
    await page.getByLabel("主题预设", { exact: true }).selectOption(theme);
});

for (const target of ["venu445mm", "venu441mm"])
  test("precise three-theme trail SDK " + target, async ({ page, request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK check");
    test.setTimeout(150000);
    const p = await raw(),
      q = projectForDevice(
        p,
        deviceKey({
          target,
          deviceSize: target === "venu445mm" ? "45mm" : "41mm",
        }),
      );
    const result = await build({
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
    const entry = (Array.isArray(result) ? result[0] : result).output.find(
      (f) => f.type === "chunk" && f.isEntry,
    )!;
    await page.goto("/");
    await page.addScriptTag({ content: entry.code });
    const submitted = await page.evaluate(async (p) => {
      const h = (window as any).gfcVisualKits;
      p.files = h.localGenerate(p);
      const f = new FormData();
      f.append(
        "project",
        JSON.stringify({
          projectId: p.id,
          projectName: p.name,
          target: p.target,
          appId: p.appId,
          revision: p.revision,
        }),
      );
      for (const file of await h.preparedCodeFiles(p))
        f.append("files", new Blob([file.content]), file.path);
      for (const a of await h.preparedAssets(p))
        f.append("files", await (await fetch(a.data)).blob(), a.path);
      const r = await fetch("/api/builds", { method: "POST", body: f });
      return { status: r.status, body: await r.json() };
    }, q);
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(202);
    const job = submitted.body,
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

test("copying a multi-device reference groups layers without desynchronizing the shared master",async()=>{const p=await raw(),copy=copyReference(p);expect(()=>validateProject(copy)).not.toThrow();expect(copy.multiDevice!.master.map(l=>[l.id,l.groupId,l.groupName])).toEqual(copy.layers.map(l=>[l.id,l.groupId,l.groupName]));expect(copy.appId).not.toBe(p.appId);});
import {nativeBitmapFontPlans,nativeBitmapFontFiles} from '../src/nativeBitmapFonts';
test('compact native metrics retain every referenced glyph width without eager multi-font tables',async()=>{
 const p=await raw();for(const v of p.multiDevice.variants){const q=projectForDevice(p,v.key),plans=nativeBitmapFontPlans(q);expect(plans).toHaveLength(14);for(const plan of plans){const font=q.bitmapFonts!.find(f=>f.id===plan.id)!,info=bitmapFontInfo(font);const binary=(c:number)=>{let lo=0,hi=plan.codes.length-1;while(lo<=hi){const mid=Math.trunc((lo+hi)/2);if(plan.codes[mid]===c)return plan.widths[mid];if(plan.codes[mid]<c)lo=mid+1;else hi=mid-1;}return undefined;};for(const g of Object.values(info.glyphs))if(plan.codes.includes(g.id))expect(binary(g.id)).toBe(g.xadvance);for(const c of [-1,0,65535])if(!plan.codes.includes(c))expect(binary(c)).toBeUndefined();}const helper=nativeBitmapFontFiles(q)[0].content;expect(helper).not.toContain('static var metrics={');expect(helper).toContain('lastId=null;lastInfo=null;');expect(helper).toContain('static function glyphIndex');expect(helper.match(/static function info_\d+\(/g)).toHaveLength(14);}
});
