import { enableDevices, selectDevice, deviceKey } from "../src/multiDevice";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { project, validateProject } from "../src/domain";
import { widgets, insertWidget, widgetNotices } from "../src/widgets";
import { resolveControls, setControl } from "../src/projectControls";
import { editorFrame, withEditorLayers } from "../src/editorHistory";
import { reading } from "../src/Scene";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
import { binaryAssets } from "../src/assets";
import { buildFetch } from "../../backend/tests/build-client.mjs";
const ids = [
  "capsule-metric",
  "segment-battery",
  "vitals-column",
  "stack-tiers",
];
test("widget instances have independent parameters, portable notices and valid deletion history", () => {
  expect(widgets).toHaveLength(4);
  const multi = insertWidget(
    enableDevices(project("MultiWidgets", true)),
    "capsule-metric",
  );
  validateProject(multi);
  expect(multi.multiDevice!.master).toHaveLength(5);
  expect(() =>
    insertWidget(
      selectDevice(multi, deviceKey(multi), "device"),
      "capsule-metric",
    ),
  ).toThrow("共享主设计");
  let p = project("Widgets", true);
  for (const id of ids) p = insertWidget(p, id);
  expect(p.layers).toHaveLength(36);
  expect(p.controls).toHaveLength(8);
  validateProject(p);
  const before = editorFrame(p);
  const oldIds = new Set(p.layers.map((l) => l.id));
  p = insertWidget(p, ids[0]);
  expect(p.layers.slice(36).every((l) => !oldIds.has(l.id))).toBe(true);
  expect(p.controls).toHaveLength(10);
  const accent = p.controls!.at(-2)!;
  p = setControl(p, accent.id, "#FFAA00");
  const resolved = resolveControls(p);
  expect(
    resolved.layers.filter(
      (l) => l.groupId === p.layers.at(-1)!.groupId && l.color === "#FFAA00",
    ),
  ).toHaveLength(2);
  expect(resolved.layers.slice(0, 36).some((l) => l.color === "#FFAA00")).toBe(
    false,
  );
  const removed = withEditorLayers(p, p.layers.slice(0, 36));
  validateProject(removed);
  expect(removed.controls).toHaveLength(8);
  expect(removed.controlValues).not.toHaveProperty(accent.id);
  const restored = validateProject({ ...removed, ...before });
  expect(widgetNotices(restored)).toHaveLength(4);
  const d = { time: "10:24", heartRate: 0, steps: 0, battery: 0, seconds: 0 };
  for (const l of restored.layers.filter(
    (l) => l.kind === "metric" && l.source === "heartRate",
  ))
    expect(reading(l, d)).toBe("--");
  for (const l of restored.layers)
    expect(generationLayer(l)).not.toHaveProperty("widgetOrigin");
  expect(JSON.stringify(restored)).toContain("MIT License");
  expect(() => localGenerate(restored)).not.toThrow();
});
test("material library inserts four editable widgets, configures, deletes, undoes and exports licenses", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Widgets"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByText("自定义控件", { exact: true }).click();
  for (const id of ids) {
    await page.getByLabel("自定义控件样式").selectOption(id);
    await page.getByRole("button", { name: "添加控件", exact: true }).click();
  }
  await page.getByText("表盘配置", { exact: true }).click();
  const settings = page.getByRole("group", { name: "表盘配置项" });
  await expect(settings.locator("input")).toHaveCount(8);
  await page.getByTitle("删除图层", { exact: true }).click();
  await expect(settings.locator("input")).toHaveCount(6);
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(settings.locator("input")).toHaveCount(8);
  await page.getByTitle("重做", { exact: true }).click();
  await expect(settings.locator("input")).toHaveCount(6);
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(settings.locator("input")).toHaveCount(8);
  await page
    .getByLabel("胶囊数据行 #1 · 主题色", { exact: true })
    .fill("#ffaa00");
  await page.getByLabel("胶囊数据行 #1 · 显示标题", { exact: true }).uncheck();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 Widgets", exact: true }).click();
  await page.getByText("表盘配置", { exact: true }).click();
  await expect(
    page.getByLabel("胶囊数据行 #1 · 显示标题", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const download = await pending;
  const zip = await readFile((await download.path())!);
  for (const id of ids)
    expect(
      zip.includes(Buffer.from("notices/widget-" + id + "-1.0.0-LICENSE.txt")),
    ).toBe(true);
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

test("all four widget types compile with native settings on both Venu 4 sizes", async () => {
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed SDK");
  test.setTimeout(240000);
  for (const [target, size] of [
    ["venu445mm", "45mm"],
    ["venu441mm", "41mm"],
  ]) {
    let p = project("WidgetsNative", true);
    p.target = target;
    p.deviceSize = size;
    for (const id of ids) p = insertWidget(p, id);
    p = setControl(p, p.controls![0].id, "#FFAA00");
    await compile(p);
  }
});
