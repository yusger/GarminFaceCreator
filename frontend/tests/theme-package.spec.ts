import { test, expect } from "@playwright/test";
import { build } from "vite";
import { readFile } from "node:fs/promises";
import { convertThemePackage } from "../../scripts/theme-project-package.mjs";
import { projectForDevice, deviceKey } from "../src/multiDevice";
import { validateProject } from "../src/domain";
test("113 converted theme package imports as editable project and preserves themes, roles and targets on export", async ({
  page,
}) => {
  const { project: p } = await convertThemePackage(
    "resources/examples/theme-project-v1",
  );
  await page.goto("/");
  await page
    .locator('input[accept=".json"]')
    .setInputFiles({
      name: "theme-sample.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByText("表盘配置", { exact: true }).click();
  for (const id of ["apex", "trail", "vital"]) {
    await page.getByLabel("主题预设", { exact: true }).selectOption(id);
    await expect(page.getByLabel("主题预设", { exact: true })).toHaveValue(id);
  }
  await page.getByLabel("vital ink", { exact: true }).fill("#abcdef");
  await page
    .getByLabel("vital data · 联动数据槽", { exact: true })
    .selectOption("battery");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(() => validateProject(saved)).not.toThrow();
  expect(saved.themes.presets).toHaveLength(3);
  expect(saved.multiDevice.variants).toHaveLength(2);
  expect(saved.fontRoles).toHaveLength(3);
  expect(saved.controlValues["vital-source"]).toBe("battery");
  await page.reload();
  await expect(page.getByText("表盘配置", { exact: true })).toBeVisible();
});
for (const target of ["venu445mm", "venu441mm"])
  test(
    "theme package prepared full project SDK " + target,
    async ({ page, request }) => {
      test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK check");
      test.setTimeout(150000);
      const { project: p } = await convertThemePackage(
          "resources/examples/theme-project-v1",
        ),
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
    },
  );
