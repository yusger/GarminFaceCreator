import { test, expect } from "@playwright/test";
import { project, validateProject, layer } from "../src/domain";
import { applyLayout, suggestedLayout } from "../src/layouts";
import { layoutTemplates } from "../src/layoutTemplates";
import { handStyles, handStylePatch } from "../src/handStyles";
import { handImageSets, createHandImageSet } from "../src/handImages";
import { handPolygon } from "../src/hands";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
import { binaryAssets } from "../src/assets";
import { designPayload } from "../src/aiDesign";
import { readFile } from "node:fs/promises";
import { buildFetch } from "../../backend/tests/build-client.mjs";

test("all layout templates create independent editable projects and preserve supported modes", () => {
  expect(layoutTemplates).toHaveLength(12);
  for (const template of layoutTemplates) {
    const p = applyLayout(
      project(template.id, true),
      suggestedLayout({ pixels: 454 }, "template:" + template.id),
    );
    const q = applyLayout(
      project(template.id, true),
      suggestedLayout({ pixels: 454 }, "template:" + template.id),
    );
    expect(p.layers.length).toBeGreaterThan(1);
    expect(p.layers[0].id).not.toBe(q.layers[0].id);
    expect(p.appId).not.toBe(q.appId);
    expect(() => validateProject(p)).not.toThrow();
    expect(() => localGenerate(p)).not.toThrow();
    if (template.mode !== "DIGITAL")
      expect(p.layers.filter((l) => l.kind === "hand")).toHaveLength(2);
  }
  for (const style of handStyles) {
    const l = { ...layer("hand"), ...handStylePatch(style.id) };
    for (const time of ["00:00", "03:00", "06:00", "09:00", "10:24"])
      for (const [x, y] of handPolygon(l, time, 30)!) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(l.w);
        expect(y).toBeLessThanOrEqual(l.h);
      }
    expect(generationLayer(l).handShape).toBeDefined();
  }
  expect(handImageSets).toHaveLength(10);
  for (const set of handImageSets) {
    const p = project(set.id, true);
    p.layers = createHandImageSet(set.key);
    expect(binaryAssets(p)).toHaveLength(4);
    expect(() => validateProject(p)).not.toThrow();
    expect(generationLayer(p.layers[0]).handBitmap).toMatchObject({
      setId: set.id,
      role: "hour",
    });
    expect(
      localGenerate(p).find((f) => f.path === "source/App.mc")!.content,
    ).toContain("Graphics.AffineTransform");
  }
  const payload = designPayload(
    {
      name: "LayoutAI",
      target: "venu445mm",
      deviceSize: "45mm",
      style: "DIGITAL",
      seconds: false,
      date: true,
      dateLocale: "en",
      sources: ["steps"],
      instruction: "test",
      layoutTemplateId: "monolith",
      backgroundPreference: { mode: "image", color: "#09121A" },
    },
    [],
  );
  expect(payload.layoutTemplate?.id).toBe("monolith");
  expect(JSON.stringify(payload)).not.toContain("data:image/");
});

test("blank creation selects a layout/color and material library inserts original hand images", async ({
  page,
}) => {
  await page.goto("/");
  page.once("dialog", (d) => d.accept("模板与指针"));
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局").selectOption("template:classic");
  await page.getByLabel("背景方式").selectOption("solid");
  await page.getByLabel("背景颜色", { exact: true }).fill("#102d3a");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByText("图片指针套装", { exact: true }).click();
  await page
    .getByLabel("指针套装", { exact: true })
    .selectOption("hand-atelier/breguet");
  await page.getByRole("button", { name: "添加整套指针", exact: true }).click();
  await expect(
    page.locator('svg.watch image[data-hand-bitmap="breguet"]'),
  ).toHaveCount(3);
  await expect(page.getByLabel("指针样式")).toHaveValue(
    "bitmap:hand-atelier/breguet",
  );
  await page.getByLabel("指针样式").selectOption("sword");
  await expect(
    page.locator('svg.watch polygon[data-hand-style="sword"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/templates-hands.png",
    fullPage: true,
  });
});

test("local background upload does not submit a build or become a model reference", async ({
  page,
}) => {
  let builds = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/builds")) builds++;
  });
  await page.goto("/");
  page.once("dialog", (d) => d.accept("本地背景"));
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局").selectOption("template:monolith");
  await page.getByLabel("背景方式").selectOption("image");
  await page
    .getByLabel("选择背景图片")
    .setInputFiles({
      name: "background.png",
      mimeType: "image/png",
      buffer: await readFile(
        "resources/default-controls/hand-images/hand-atelier/hands/silver-sword-minute.png",
      ),
    });
  await expect(page.getByAltText("背景图片预览")).toBeVisible();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  expect(builds).toBe(0);
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await page.getByRole("button", { name: /^AI 创建表盘/ }).click();
  await page
    .getByRole("button", { name: "2. 时间与数据", exact: true })
    .click();
  await page.getByLabel("布局模板", { exact: true }).selectOption("pure");
  await expect(page.getByLabel("时间风格")).toHaveValue("ANALOG");
  await expect(page.getByAltText("极简模板预览")).toBeVisible();
});

async function compile(p: ReturnType<typeof project>) {
  const base = process.env.GFC_TEST_URL!;
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: p.id,
      appId: p.appId,
      target: p.target || "venu445mm",
      deviceSize: p.deviceSize || "45mm",
      projectName: p.name,
      revision: 0,
    }),
  );
  for (const f of localGenerate(p))
    form.append("files", new Blob([f.content]), f.path);
  for (const a of binaryAssets(p))
    form.append(
      "files",
      new Blob([Buffer.from(a.data.split(",")[1], "base64")]),
      a.path,
    );
  const submitted = await buildFetch(base + "/api/builds", {
    method: "POST",
    body: form,
  });
  expect(submitted.status, await submitted.clone().text()).toBe(202);
  const job = await submitted.json();
  for (let i = 0; i < 160; i++) {
    const done = await (
      await buildFetch(base + "/api/builds/" + job.buildId)
    ).json();
    if (!["queued", "running"].includes(done.status)) {
      const log = await (
        await buildFetch(base + "/api/builds/" + job.buildId + "/logs")
      ).text();
      expect(done.status, log).toBe("succeeded");
      expect(
        (await (await buildFetch(base + done.artifacts[0].url)).arrayBuffer())
          .byteLength,
      ).toBeGreaterThan(500);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("Compile timeout");
}
test("real native compilation supports template, polygon and bitmap hands on both Venu 4 sizes", async () => {
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed SDK");
  test.setTimeout(240000);
  for (const [target, size] of [
    ["venu445mm", "45mm"],
    ["venu441mm", "41mm"],
  ]) {
    const p = applyLayout(
      project("HandImages", true),
      suggestedLayout(
        { pixels: size === "45mm" ? 454 : 390 },
        "template:monolith",
      ),
    );
    p.target = target;
    p.deviceSize = size;
    p.layers = [
      ...p.layers,
      ...createHandImageSet("hand-atelier/skeleton"),
      { ...layer("hand"), ...handStylePatch("arrow") },
    ];
    await compile(p);
  }
});
