import { build } from "vite";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { componentStyleFixture as fixture } from "./fixtures/componentStyleFixture";
import {
  createComponentStyle,
  publishComponentStyle,
  bindComponentStyle,
  detachComponentStyle,
  deleteComponentStyle,
} from "../src/componentStyles";
import { cloneCompound } from "../src/widgets";
import { validateProject, layer } from "../src/domain";
import {
  editorFrame,
  restoreEditorFrame,
  withEditorLayers,
} from "../src/editorHistory";
import {
  enableDevices,
  addDevice,
  selectDevice,
  deviceKey,
} from "../src/multiDevice";
import { devices } from "../src/devices";
import { applyChat, chatPayload } from "../src/designChat";
import { createFontRole } from "../src/fontRoles";
import { localGenerate } from "../src/localGenerator";
const setup = () =>
  createComponentStyle(fixture(), "widget-a", "Capsule", "capsule");
function two() {
  const p = setup(),
    copy = cloneCompound(p.layers[0]);
  copy.name = "Second capsule";
  copy.x = 100;
  copy.y = 300;
  copy.compound!.layers.reverse();
  copy.compound!.controlValues = { [copy.compound!.controls[0].id]: "battery" };
  copy.compound!.parts[0].enabled = false;
  p.layers.push(copy);
  validateProject(p);
  return p;
}
function editBackground(p: ReturnType<typeof fixture>, w: number) {
  return withEditorLayers(
    p,
    p.layers.map((l, i) =>
      i
        ? l
        : {
            ...l,
            compound: {
              ...l.compound!,
              layers: l.compound!.layers.map((c) =>
                c.id === "bg-a" ? { ...c, w } : c,
              ),
            },
          },
    ),
  );
}
test("master update follows explicit slot mapping and preserves instance geometry, sources and switches", () => {
  let p = two();
  const old = structuredClone(p.layers[1]);
  p = editBackground(p, 210);
  expect(p.layers[0].compoundOverrides?.["bg-a"].w).toBe(210);
  expect(p.layers[0].compound!.layers.find((c) => c.id === "bg-a")!.w).toBe(
    240,
  );
  p = publishComponentStyle(p, "widget-a");
  expect(p.componentStyles![0].version).toBe(2);
  expect(p.layers[1].x).toBe(old.x);
  expect(p.layers[1].y).toBe(old.y);
  expect(p.layers[1].compound!.controlValues).toEqual(
    old.compound!.controlValues,
  );
  expect(p.layers[1].compound!.parts).toEqual(old.compound!.parts);
  const id = p.layers[1].componentStyle!.bindings["bg-a"];
  expect(p.layers[1].compound!.layers.find((c) => c.id === id)!.w).toBe(210);
  expect(p.layers[0].compoundOverrides).toBeUndefined();
  expect(() => validateProject(p)).not.toThrow();
});
test("independent instance appearance override survives newer master version", () => {
  let p = two();
  const id = p.layers[1].componentStyle!.bindings["bg-a"];
  p.layers[1].compoundOverrides = { [id]: { w: 190 } };
  p = publishComponentStyle(editBackground(p, 210), "widget-a");
  expect(p.layers[1].compoundOverrides![id].w).toBe(190);
  expect(p.layers[1].compound!.layers.find((c) => c.id === id)!.w).toBe(210);
});
test("detach keeps exact visible structure and notices; in-use definition deletion rejects", () => {
  let p = two();
  expect(() => deleteComponentStyle(p, "capsule")).toThrow(/引用/);
  const before = structuredClone(p.layers[1]),
    id = before.id;
  p = detachComponentStyle(p, id);
  expect(p.layers[1]).toEqual({ ...before, componentStyle: undefined });
  p = publishComponentStyle(editBackground(p, 200), "widget-a");
  expect(p.layers[1].compound).toEqual(before.compound);
  p = detachComponentStyle(p, "widget-a");
  p = deleteComponentStyle(p, "capsule");
  expect(p.componentStyles).toEqual([]);
});
test("manual binding requires complete one-to-one mapping, never layer order", () => {
  let p = setup(),
    copy = cloneCompound(p.layers[0]);
  copy.componentStyle = undefined;
  copy.compound!.layers.reverse();
  p.layers.push(copy);
  expect(() => bindComponentStyle(p, copy.id, "capsule", {})).toThrow(/插槽/);
  const mapping = Object.fromEntries(
    p.componentStyles![0].slots.map((s) => [
      s.key,
      copy.compound!.layers.find((c) => c.kind === s.kind)!.id,
    ]),
  );
  p = bindComponentStyle(p, copy.id, "capsule", mapping);
  expect(p.layers[1].componentStyle!.bindings).toEqual(mapping);
  expect(() => validateProject(p)).not.toThrow();
});
test("locked instance, target-only scope and stale mappings reject atomically", () => {
  const p = two();
  p.layers[1].locked = true;
  const old = JSON.stringify(p);
  expect(() => publishComponentStyle(p, "widget-a")).toThrow(/锁定/);
  expect(JSON.stringify(p)).toBe(old);
  const q = setup();
  q.layers[0].componentStyle!.version = 99;
  expect(() => validateProject(q)).toThrow(/版本/);
  const r = setup();
  r.layers[0].componentStyle!.bindings["bg-a"] = "missing";
  expect(() => validateProject(r)).toThrow(/映射/);
  const m = enableDevices(setup());
  m.multiDevice!.scope = "device";
  expect(() => detachComponentStyle(m, "widget-a")).toThrow(/共享/);
});
test("undo, redo and import retain style definitions and instance references", () => {
  const p = two(),
    frame = editorFrame(p),
    changed = publishComponentStyle(editBackground(p, 210), "widget-a"),
    restored = restoreEditorFrame(changed, frame);
  expect(restored.componentStyles).toEqual(p.componentStyles);
  expect(restored.layers).toEqual(p.layers);
  const redo = restoreEditorFrame(restored, editorFrame(changed));
  expect(redo.componentStyles![0].version).toBe(2);
  const imported = validateProject(JSON.parse(JSON.stringify(changed)));
  expect(imported.id).not.toBe(changed.id);
  expect(imported.componentStyles).toEqual(changed.componentStyles);
  expect(imported.layers[1].componentStyle).toEqual(
    changed.layers[1].componentStyle,
  );
  expect(() => validateProject(imported)).not.toThrow();
});
test("multi-device style publish retains target compound overrides and invalidates all code histories", () => {
  let p = addDevice(
    enableDevices(two()),
    devices.find((d) => d.id === "venu441mm")!,
  );
  p = selectDevice(
    p,
    deviceKey({ target: "venu445mm", deviceSize: "45mm" }),
    "master",
  );
  const v = p.multiDevice!.variants.find((v) => v.target === "venu441mm")!;
  v.overrides["widget-a"] = { compoundOverrides: { "data-a": { size: 25 } } };
  p = publishComponentStyle(editBackground(p, 210), "widget-a");
  expect(
    p.multiDevice!.variants.find((v) => v.target === "venu441mm")!.overrides[
      "widget-a"
    ],
  ).toEqual({ compoundOverrides: { "data-a": { size: 25 } } });
  expect(p.multiDevice!.variants.every((v) => v.code.codeRevision === -1)).toBe(
    true,
  );
  expect(() => validateProject(p)).not.toThrow();
});
test("public AI style create, publish, detach are atomic; private definition patches reject", () => {
  const p = fixture(),
    q = applyChat(
      p,
      JSON.stringify({
        message: "Link",
        operations: [
          {
            type: "componentStyle",
            action: "create",
            layerId: "widget-a",
            name: "Master",
          },
        ],
      }),
    ).project;
  expect(q.componentStyles).toHaveLength(1);
  const r = applyChat(
    q,
    JSON.stringify({
      message: "Update",
      operations: [
        { type: "componentStyle", action: "publish", layerId: "widget-a" },
      ],
    }),
  ).project;
  expect(r.componentStyles![0].version).toBe(2);
  expect(chatPayload(r, "x", []) as any).toBeTruthy();
  expect(() =>
    applyChat(
      r,
      JSON.stringify({
        message: "Bad",
        operations: [
          {
            type: "update",
            id: "widget-a",
            patch: { componentStyle: { id: "forged" } },
          },
        ],
      }),
    ),
  ).toThrow();
  const s = applyChat(
    r,
    JSON.stringify({
      message: "Detach",
      operations: [
        { type: "componentStyle", action: "detach", layerId: "widget-a" },
      ],
    }),
  ).project;
  expect(s.layers[0].componentStyle).toBeUndefined();
});
test("unrelated font roles coexist with compound validation and deterministic generation", () => {
  let p = setup();
  p.layers.push({ ...layer("text"), id: "label", text: "HELLO" });
  p = createFontRole(p, "body", "Body", "sonar_label_font", ["label"]);
  expect(() => validateProject(p)).not.toThrow();
  expect(localGenerate(p).some((f) => f.path === "source/App.mc")).toBe(true);
});

test("component style UI creates links, publishes, undoes and persists", async ({
  page,
}) => {
  const p = fixture();
  await page.goto("/");
  await page.locator('input[accept=".json"]').setInputFiles({
    name: "style.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page
    .locator(".layer-row")
    .filter({ hasText: "Styled capsule" })
    .click();
  await page.getByText("组件主样式与实例", { exact: true }).click();
  await page.getByLabel("主样式名称", { exact: true }).fill("Capsule");
  await page
    .getByRole("button", { name: "创建并关联主样式", exact: true })
    .click();
  await expect(
    page.getByText("Capsule · v1 · 1个实例", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "用当前外观更新全部实例", exact: true })
    .click();
  await expect(
    page.getByText("Capsule · v2 · 1个实例", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(
    page.getByText("Capsule · v1 · 1个实例", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(
    page.getByText("Capsule · v2 · 1个实例", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await wait).path())!, "utf8"),
  );
  expect(saved.schemaVersion).toBe(50);
  expect(saved.componentStyles[0].version).toBe(2);
  expect(() => validateProject(saved)).not.toThrow();
  await page.reload();
  await page.getByRole("button", { name: "我的表盘", exact: true }).click();
  await page
    .getByRole("button", { name: "打开 ComponentStyles", exact: true })
    .click();
  await page
    .locator(".layer-row")
    .filter({ hasText: "Styled capsule" })
    .click();
  await page.getByText("组件主样式与实例", { exact: true }).click();
  await expect(
    page.getByText("Capsule · v2 · 1个实例", { exact: true }),
  ).toBeVisible();
});

test("schema49 migration keeps compound identities and notices without inventing a style", () => {
  const p = fixture();
  const old = { ...p, schemaVersion: 49 };
  const restored = validateProject(old);
  expect(restored.schemaVersion).toBe(50);
  expect(restored.componentStyles).toBeUndefined();
  expect(restored.layers[0].compound).toEqual(p.layers[0].compound);
});

test("style definitions restore with design snapshots and reject missing appearance fields", async () => {
  const { saveDesignSnapshot, restoreDesignSnapshot } =
    await import("../src/designHistory");
  const saved = saveDesignSnapshot(setup(), "Before");
  const changed = publishComponentStyle(editBackground(saved, 210), "widget-a");
  const restored = restoreDesignSnapshot(changed, saved.activeDesignSnapshot!);
  expect(restored.componentStyles![0].version).toBe(1);
  expect(() => validateProject(restored)).not.toThrow();
  const malformed = setup();
  delete malformed.componentStyles![0].slots[0].style.w;
  expect(() => validateProject(malformed)).toThrow(/插槽/);
});

for (const target of ["venu445mm", "venu441mm"])
  test(
    "component master and instances SDK " + target,
    async ({ page, request }) => {
      test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK check");
      test.setTimeout(150000);
      let q = publishComponentStyle(editBackground(two(), 210), "widget-a");
      q.target = target;
      q.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
      q.layers.push({
        ...layer("time"),
        id: "clock",
        x: 60,
        y: 30,
        w: 334,
        h: 90,
        size: 60,
      });
      q = createFontRole(q, "clock-font", "Clock", "sonar_number_font", [
        "clock",
      ]);
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
