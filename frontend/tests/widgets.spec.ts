import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { layer, project, validateProject, type Project } from "../src/domain";
import {
  widgets,
  insertWidget,
  cloneCompound,
  decomposeWidget,
  widgetNotices,
} from "../src/widgets";
import { expandWidgets, migrateCompounds } from "../src/compound";
import {
  enableDevices,
  selectDevice,
  deviceKey,
  addDevice,
  reconcileDevices,
  projectForDevice,
} from "../src/multiDevice";
import { devices } from "../src/devices";
import { resolveControls } from "../src/projectControls";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
import { migrateProject } from "../src/migrations";
import { editorFrame } from "../src/editorHistory";
import { reading } from "../src/Scene";
import { generationLayer, generationHeader } from "../src/generationDto";
import { generationRequirements } from "../src/generationRequirements";
import { localGenerate } from "../src/localGenerator";
import { binaryAssets } from "../src/assets";
import { buildFetch } from "../../backend/tests/build-client.mjs";
const ids = [
  "capsule-metric",
  "segment-battery",
  "vitals-column",
  "stack-tiers",
];
const preview = {
  time: "10:24",
  heartRate: 0,
  steps: 0,
  battery: 0,
  seconds: 0,
};
function all() {
  let p = project("Widgets", true);
  for (const id of ids) p = insertWidget(p, id);
  return p;
}
test("compound objects keep private children, independent copies and coherent part visibility", () => {
  const p = all();
  expect(p.layers).toHaveLength(4);
  expect(p.layers.every((l) => l.kind === "widget")).toBe(true);
  expect(expandWidgets(p).layers).toHaveLength(36);
  validateProject(p);
  expect(widgetNotices(p)).toHaveLength(4);
  expect(generationRequirements(p).dataSources).toBeDefined();
  const root = p.layers[0],
    copy = cloneCompound(root);
  copy.x += 20;
  copy.w *= 0.5;
  copy.h *= 0.5;
  const idsBefore = new Set(root.compound!.layers.map((l) => l.id));
  expect(copy.compound!.layers.every((l) => !idsBefore.has(l.id))).toBe(true);
  const c = copy.compound!.controls[0];
  copy.compound!.controlValues = { [c.id]: "#FFAA00" };
  const next = { ...p, layers: [...p.layers, copy] };
  validateProject(next);
  const flat = expandWidgets(next);
  expect(flat.layers.filter((l) => l.color === "#FFAA00")).toHaveLength(2);
  expect(flat.layers[0].x).toBe(expandWidgets(p).layers[0].x);
  const part = root.compound!.parts.find((p) => p.id === "titles")!;
  part.enabled = false;
  const off = expandWidgets(p);
  expect(
    off.layers
      .filter((l) => part.layerIds.includes(l.id))
      .every(
        (l) =>
          l.exportIncluded === false &&
          l.aod === false &&
          l.activeVisible === false,
      ),
  ).toBe(true);
  part.enabled = true;
  part.active = false;
  part.aod = true;
  const mixed = expandWidgets(p);
  expect(
    mixed.layers
      .filter((l) => part.layerIds.includes(l.id))
      .every((l) => l.aod && l.activeVisible === false),
  ).toBe(true);
  for (const l of mixed.layers.filter(
    (l) => l.kind === "metric" && l.source === "heartRate",
  ))
    expect(reading(l, preview)).toBe("--");
  expect(JSON.stringify(mixed.layers.map(generationLayer))).not.toContain(
    "compound",
  );
  expect(() => generationHeader(mixed)).not.toThrow();
  const frame = editorFrame(p);
  const decomposed = decomposeWidget(p, root.id);
  expect(decomposed.layers).toHaveLength(8);
  expect(decomposed.layers[0].kind).not.toBe("widget");
  validateProject(decomposed);
  validateProject({ ...decomposed, ...frame });
  expect(() => localGenerate(p)).not.toThrow();
  for (const mutate of [
    (q: Project) => q.layers[0].compound!.layers.push(q.layers[0]),
    (q: Project) =>
      q.layers[0].compound!.parts[0].layerIds.push(
        q.layers[0].compound!.parts[0].layerIds[0],
      ),
    (q: Project) =>
      (q.layers[0].compound!.controls[0].targets[0].layerId = "missing"),
  ]) {
    const q = structuredClone(p);
    mutate(q);
    expect(() => validateProject(q)).toThrow();
  }
});
function legacy() {
  const p = project("LegacyWidgets", true),
    w = widgets.find((w) => w.id === "capsule-metric")!;
  const origin = {
    id: w.id,
    version: w.version,
    license: w.licenseText,
    notice: w.notice,
  };
  p.layers = w.layers.map((d) => ({
    ...layer(d.kind),
    ...structuredClone(d),
    threshold: false,
    metricDecoration: false,
    x: d.x! + 100,
    y: d.y! + 160,
    groupId: "old-group",
    groupName: w.name,
    widgetOrigin: origin,
  }));
  p.controls = structuredClone(w.parameters);
  p.controlValues = Object.fromEntries(
    p.controls.map((c) => [c.id, c.type === "boolean" ? false : "#FFAA00"]),
  );
  return p;
}
test("schema25 groups and snapshots migrate without losing drawing or per-device styles", () => {
  let old = legacy();
  const before = resolveControls(old);
  old = saveDesignSnapshot(old, "Old");
  old.schemaVersion = 25;
  const next = migrateProject(old);
  expect(next.layers).toHaveLength(1);
  expect(next.layers[0].kind).toBe("widget");
  expect(next.codeRevision).toBe(-1);
  const flat = expandWidgets(next);
  for (const l of before.layers) {
    const migrated = flat.layers.find((c) => c.id === l.id)!;
    for (const key of [
      "x",
      "y",
      "w",
      "h",
      "color",
      "aod",
      "activeVisible",
    ] as const)
      expect(migrated[key]).toBe(
        key === "activeVisible" ? l.activeVisible !== false : l[key],
      );
  }
  expect(next.designSnapshots![0].layers).toHaveLength(1);
  validateProject(next);
  expect(
    restoreDesignSnapshot(next, next.designSnapshots![0].id).layers[0].kind,
  ).toBe("widget");
  old = legacy();
  old = addDevice(
    enableDevices(old),
    devices.find((d) => d.id === "venu441mm")!,
  );
  old = reconcileDevices(old, {
    ...old,
    layers: old.layers.map((l, i) =>
      i === 0 ? { ...l, x: l.x + 17, color: "#FF0000" } : l,
    ),
  })!;
  const expected = resolveControls(old).layers;
  old.schemaVersion = 25;
  const multi = migrateProject(old);
  validateProject(multi);
  const flattened = expandWidgets(multi);
  for (const l of expected) {
    const actual = flattened.layers.find((c) => c.id === l.id)!;
    expect(actual.x).toBe(l.x);
    expect(actual.color).toBe(l.color);
  }
  const master = selectDevice(multi, deviceKey(multi), "master");
  const inserted = insertWidget(master, "stack-tiers");
  validateProject(inserted);
  expect(inserted.multiDevice!.master).toHaveLength(2);
  expect(() =>
    insertWidget(
      selectDevice(inserted, deviceKey(inserted), "device"),
      "stack-tiers",
    ),
  ).toThrow("共享主设计");
  const decomposed = decomposeWidget(master, master.layers[0].id);
  validateProject(decomposed);
  const variant = projectForDevice(decomposed, "venu441mm:41mm");
  expect(variant.layers[0].x).toBe(expected[0].x);
});
test("one layer node supports part switches, copy/delete, undo, save and source license export", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Widgets"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByText("自定义控件", { exact: true }).click();
  await page.getByLabel("自定义控件样式").selectOption("capsule-metric");
  await page.getByRole("button", { name: "添加控件", exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.getByLabel("复合控件名称")).toHaveValue("胶囊数据行 #1");
  await page.getByLabel("图标 启用", { exact: true }).uncheck();
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(4);
  await page.getByLabel("图标 启用", { exact: true }).check();
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(5);
  await page.getByLabel("标题与标注 亮屏", { exact: true }).uncheck();
  await page.getByLabel("标题与标注 息屏", { exact: true }).check();
  await page.getByLabel("控件主题色", { exact: true }).fill("#ffaa00");
  await page.getByTitle("复制图层", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(2);
  await page.getByTitle("删除图层", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(2);
  await page.getByTitle("重做", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await page.locator(".layer-row").first().click();
  await page
    .getByRole("button", { name: "拆解为基础图层", exact: true })
    .click();
  await expect(page.locator(".layer-row")).toHaveCount(5);
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 Widgets", exact: true }).click();
  await page.locator(".layer-row").first().click();
  await expect(
    page.getByLabel("标题与标注 亮屏", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("标题与标注 息屏", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await page.getByText("自定义控件", { exact: true }).click();
  for (const id of ids.slice(1)) {
    await page.getByLabel("自定义控件样式").selectOption(id);
    await page.getByRole("button", { name: "添加控件", exact: true }).click();
  }
  await expect(page.locator(".layer-row")).toHaveCount(4);
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const zip = await readFile((await (await pending).path())!);
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

test("native compilation expands compounds and preserves part AOD on both Venu 4 sizes", async () => {
  test.skip(!process.env.GFC_TEST_URL, "Requires SDK");
  test.setTimeout(240000);
  for (const [target, size] of [
    ["venu445mm", "45mm"],
    ["venu441mm", "41mm"],
  ]) {
    const p = all();
    p.name = "NativeCompounds";
    p.target = target;
    p.deviceSize = size;
    const b = p.layers[0].compound!;
    b.parts.find((part) => part.id === "titles")!.active = false;
    b.parts.find((part) => part.id === "titles")!.aod = true;
    b.controlValues = { [b.controls[0].id]: "#FFAA00" };
    p.layers[1].compound!.parts.find(
      (part) => part.id === "progress",
    )!.enabled = false;
    await compile(p);
  }
});
