import { test, expect } from "@playwright/test";
import { build } from "vite";
import { readFile } from "node:fs/promises";
import { project, validateProject } from "../src/domain";
import { applyLayout, suggestedLayout } from "../src/layouts";
import { layoutTemplates, applyTemplate } from "../src/layoutTemplates";
import { resolveControls, setControl } from "../src/projectControls";
import { designPayload } from "../src/aiDesign";
import { localGenerate } from "../src/localGenerator";
const kits = layoutTemplates.filter((t) => t.visualKit);
function fixture(id: string, target = "venu445mm") {
  const p = project(id, true);
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  return applyLayout(p, {
    ...suggestedLayout(
      { pixels: target === "venu445mm" ? 454 : 390 },
      "template:" + id,
    ),
    safeInsetPx: 0,
  });
}
test("three editable visual kits retain licensed resources, explicit independent palette bindings and reduced AOD", () => {
  expect(kits).toHaveLength(3);
  for (const kit of kits)
    for (const target of ["venu445mm", "venu441mm"]) {
      const p = fixture(kit.id, target),
        before = JSON.stringify(p);
      expect(() => validateProject(p)).not.toThrow();
      expect(() => localGenerate(p)).not.toThrow();
      expect(p.assets || []).toHaveLength(0);
      expect(p.layers.some((l) => l.customFont)).toBe(true);
      expect(p.layers.some((l) => l.libraryIcon)).toBe(true);
      const sleep = p.layers.filter((l) => l.aod);
      expect(sleep).toHaveLength(1);
      expect(sleep[0]).toMatchObject({ kind: "time", activeVisible: false });
      const control = p.controls![0],
        next = setControl(p, control.id, "#123456"),
        resolved = resolveControls(next);
      for (const l of p.layers) {
        expect(resolved.layers.find((r) => r.id === l.id)!.color).toBe(
          control.targets.some((t) => t.layerId === l.id) ? "#123456" : l.color,
        );
      }
      expect(JSON.stringify(p)).toBe(before);
      expect(() =>
        validateProject(JSON.parse(JSON.stringify(next))),
      ).not.toThrow();
    }
  expect(
    kits
      .find((k) => k.id === "kit-activity")!
      .layers.filter((l) => l.kind === "ring")
      .every((l) => l.ringStyle === "continuous" && l.ringCap === "round"),
  ).toBe(true);
});
test("visual kit prompt uses public resource selection fields and rejects unsupported targets", () => {
  for (const kit of kits) {
    const c = {
      name: "Kit",
      target: "venu445mm",
      deviceSize: "45mm",
      style: kit.mode,
      date: true,
      dateLocale: "en" as const,
      seconds: false,
      sources: kit.defaultSources,
      instruction: "Test",
      layoutTemplateId: kit.id,
    };
    const payload = designPayload(c, []);
    const raw = JSON.stringify(payload.layoutTemplate);
    expect(raw).not.toContain('"customFont"');
    expect(raw).not.toContain('"libraryIcon"');
    expect(raw).toContain('"fontId"');
    expect(raw).toContain('"iconId"');
    expect(() =>
      designPayload({ ...c, target: "fenix847mm", deviceSize: "47mm" }, []),
    ).toThrow(/Venu 4/);
    const p = project("Wrong");
    p.target = "fenix847mm";
    expect(() => applyTemplate(p, kit.id)).toThrow(/Venu 4/);
  }
});
test("native sleep lifecycle re-arms frame completion reporting on both transitions", () => {
  const src = localGenerate(fixture("kit-minimal")).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(src).toContain(
    "function onEnterSleep(){sleeping=true;gfcFrameReported=false;WatchUi.requestUpdate();}",
  );
  expect(src).toContain(
    "function onExitSleep(){sleeping=false;gfcFrameReported=false;WatchUi.requestUpdate();}",
  );
});
for (const kit of kits)
  test(
    "113 visual kit creates editable layers, local palette and AOD preview " +
      kit.id,
    async ({ page }) => {
      const posts: string[] = [];
      page.on("request", (r) => {
        if (r.method() === "POST") posts.push(r.url());
      });
      page.once("dialog", (d) => d.accept(kit.id));
      await page.goto("/");
      await page.getByRole("button", { name: /^空白画布/ }).click();
      await page
        .getByLabel("初始布局", { exact: true })
        .selectOption("template:" + kit.id);
      await page.getByRole("button", { name: "创建项目", exact: true }).click();
      await expect(
        page.getByText("已保存到本机", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".layer-row")).toHaveCount(kit.layers.length);
      await page.getByText("表盘配置", { exact: true }).click();
      await page
        .getByLabel(kit.visualKit!.colorRoles[0].label, { exact: true })
        .fill("#123456");
      await expect(
        page.getByText("已保存到本机", { exact: true }),
      ).toBeVisible();
      const wait = page.waitForEvent("download");
      await page.getByRole("button", { name: "导出项目", exact: true }).click();
      const saved = JSON.parse(
        await readFile((await (await wait).path())!, "utf8"),
      );
      expect(
        saved.controlValues["kit-" + kit.visualKit!.colorRoles[0].id],
      ).toBe("#123456");
      expect(
        saved.layers.some((l: any) => l.activeVisible === false && l.aod),
      ).toBe(true);
      expect(posts).toEqual([]);
      await page.reload();
      await page
        .getByRole("button", { name: "打开 " + kit.id, exact: true })
        .click();
      await page.getByText("表盘配置", { exact: true }).click();
      await expect(
        page.getByLabel(kit.visualKit!.colorRoles[0].label, { exact: true }),
      ).toHaveValue("#123456");
    },
  );
for (const kit of kits)
  for (const key of ["venu445mm", "venu441mm"])
    test("visual kit SDK " + kit.id + " " + key, async ({ page, request }) => {
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
            entry: "frontend/tests/fixtures/visualKitHarness.ts",
            name: "GfcVisualKitHarness",
            formats: ["iife"],
          },
        },
      });
      const entry = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(
        (f) => f.type === "chunk" && f.isEntry,
      )!;
      await page.goto("/");
      await page.addScriptTag({ content: entry.code });
      const result = await page.evaluate(
        async ({ key, id }) => {
          const h = (window as any).gfcVisualKits,
            p = h.fixture(id, key);
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
        },
        { key, id: kit.id },
      );
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
