import { roleFixture as fixture } from "./fixtures/roleFixture";
import { build } from "vite";
import { readFile } from "node:fs/promises";
import { createDataSlot } from "../src/dataSlots";
import { localGenerate } from "../src/localGenerator";
import { test, expect } from "@playwright/test";
import { project, layer, validateProject, type Project } from "../src/domain";
import {
  createFontRole,
  setFontRole,
  detachFontRole,
  captureFontRoleEdits,
  layerFontChoice,
} from "../src/fontRoles";
import { fontPatch } from "../src/fontLibrary";
import {
  withEditorLayers,
  editorFrame,
  restoreEditorFrame,
} from "../src/editorHistory";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
import {
  enableDevices,
  addDevice,
  reconcileDevices,
  projectForDevice,
} from "../src/multiDevice";
import { devices } from "../src/devices";
import { applyChat, chatPayload } from "../src/designChat";
import { generationHeader } from "../src/generationDto";
import { detachColorTarget, setColorRoleSemantic } from "../src/colorRoles";
import { setControl, resolveControls } from "../src/projectControls";
import { defaultThresholds } from "../src/thresholds";
import { themedFixture } from "./fixtures/themedFixture";

test("explicit font roles preserve each member's layout and individual detachment survives future role changes", () => {
  const p = fixture(),
    r = createFontRole(
      p,
      "role-body",
      "Body",
      "sonar_label_font",
      p.layers.map((l) => l.id),
    );
  expect(r.fontRoles![0].layerIds).toEqual(["title-a", "title-b"]);
  expect(r.layers.map((l) => [l.x, l.y, l.w, l.h, l.size])).toEqual(
    p.layers.map((l) => [l.x, l.y, l.w, l.h, l.size]),
  );
  const changed = withEditorLayers(
    r,
    r.layers.map((l) =>
      l.id === "title-a" ? { ...l, ...fontPatch("sonar_number_font") } : l,
    ),
  );
  expect(changed.fontRoles![0].layerIds).toEqual(["title-b"]);
  const n = setFontRole(changed, "role-body", "rajdhani_light");
  expect(layerFontChoice(n.layers[0])).toBe("sonar_number_font");
  expect(layerFontChoice(n.layers[1])).toBe("rajdhani_light");
  expect(() => validateProject(n)).not.toThrow();
  expect(p.fontRoles).toBeUndefined();
  const unlinked = detachFontRole(n, "role-body");
  expect(unlinked.fontRoles).toEqual([]);
  expect(unlinked.layers).toEqual(n.layers);
});
test("font role import, history, member deletion and undo retain explicit identities without stale references", () => {
  const p = createFontRole(fixture(), "role-body", "Body", "sonar_label_font", [
      "title-a",
      "title-b",
    ]),
    copy = validateProject(JSON.parse(JSON.stringify(p)));
  expect(copy.fontRoles![0].layerIds).toEqual(copy.layers.map((l) => l.id));
  expect(() => validateProject(copy)).not.toThrow();
  const snap = saveDesignSnapshot(p, "Fonts"),
    changed = detachFontRole(snap, "role-body", "title-a"),
    restored = restoreDesignSnapshot(changed, snap.designSnapshots![0].id);
  expect(restored.fontRoles).toEqual(p.fontRoles);
  const undone = restoreEditorFrame(changed, editorFrame(p));
  expect(undone.fontRoles).toEqual(p.fontRoles);
  const deleted = withEditorLayers(
    p,
    p.layers.filter((l) => l.id !== "title-a"),
  );
  expect(deleted.fontRoles![0].layerIds).toEqual(["title-b"]);
  expect(() => validateProject(deleted)).not.toThrow();
});
test("font role edits reject missing, cross-theme, locked and unapproved changes atomically", () => {
  const p = createFontRole(fixture(), "role-body", "Body", "sonar_label_font", [
      "title-a",
      "title-b",
    ]),
    before = JSON.stringify(p),
    bad = structuredClone(p);
  bad.layers[1].locked = true;
  expect(() => setFontRole(bad, "role-body", "rajdhani_bold")).toThrow(/锁定/);
  expect(() => setFontRole(p, "role-body", "arbitrary-font")).toThrow();
  expect(JSON.stringify(p)).toBe(before);
  const t = themedFixture();
  expect(() =>
    createFontRole(
      t,
      "role-cross",
      "Cross",
      "sonar_label_font",
      t.layers.map((l) => l.id),
    ),
  ).toThrow(/跨主题/);
  const malformed = structuredClone(p);
  malformed.fontRoles![0].id = undefined as any;
  expect(() => validateProject(malformed)).toThrow(/角色/);
  malformed.fontRoles![0].id = "role-body";
  malformed.fontRoles![0].fontId = "rajdhani_light";
  expect(() => validateProject(malformed)).toThrow(/不一致/);
});
test("device font independence survives shared role changes, validation and single-device export", () => {
  let p = createFontRole(fixture(), "role-body", "Body", "sonar_label_font", [
    "title-a",
    "title-b",
  ]);
  p = addDevice(
    enableDevices(p),
    devices.find((d) => d.id === "venu441mm")!,
  );
  p = reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l) =>
      l.id === "title-a" ? { ...l, ...fontPatch("sonar_number_font") } : l,
    ),
    revision: p.revision + 1,
  })!;
  expect(() => validateProject(p)).not.toThrow();
  const device = projectForDevice(p, "venu441mm:41mm");
  expect(device.fontRoles![0].layerIds).toEqual(["title-b"]);
  expect(() => validateProject(device)).not.toThrow();
  expect(() => setFontRole(p, "role-body", "rajdhani_bold")).toThrow(
    /共享主设计/,
  );
});
test("public AI role edits are atomic and individual font changes detach only the changed member", () => {
  const p = createFontRole(fixture(), "role-body", "Body", "sonar_label_font", [
      "title-a",
      "title-b",
    ]),
    raw = (operations: any[]) =>
      JSON.stringify({ message: "Fonts", operations });
  const n = applyChat(
    p,
    raw([{ type: "font", id: "title-a", fontId: "sonar_number_font" }]),
  ).project;
  expect(n.fontRoles![0].layerIds).toEqual(["title-b"]);
  const grouped = applyChat(
    n,
    raw([
      {
        type: "fontRole",
        action: "set",
        roleId: "role-body",
        fontId: "rajdhani_bold",
      },
    ]),
  ).project;
  expect(layerFontChoice(grouped.layers[1])).toBe("rajdhani_bold");
  expect(layerFontChoice(grouped.layers[0])).toBe("sonar_number_font");
  expect(generationHeader(grouped).fontRoles![0].id).toBe("role-body");
  const before = JSON.stringify(p);
  expect(() =>
    applyChat(
      p,
      raw([
        {
          type: "fontRole",
          action: "set",
          roleId: "role-body",
          fontId: "rajdhani_bold",
        },
        {
          type: "fontRole",
          action: "set",
          roleId: "missing",
          fontId: "sonar_label_font",
        },
      ]),
    ),
  ).toThrow();
  expect(JSON.stringify(p)).toBe(before);
});
test("color role semantics, threshold colors and explicit detachment remain independent", () => {
  const p = fixture();
  p.layers[0] = {
    ...p.layers[0],
    kind: "metric",
    source: "heartRate",
    threshold: true,
    thresholdRules: defaultThresholds("heartRate", "#FFFFFF"),
  };
  p.controls = [
    {
      id: "primary",
      label: "Primary",
      type: "color",
      default: "#123456",
      targets: [
        { layerId: "title-a", property: "color" },
        { layerId: "title-b", property: "color" },
      ],
    },
    {
      id: "warning",
      label: "Warning",
      type: "color",
      default: "#FFFF00",
      targets: [{ layerId: "title-a", property: "thresholdRules.1.color" }],
    },
  ];
  let n = setColorRoleSemantic(p, "primary", "primary");
  n = setColorRoleSemantic(n, "warning", "warning");
  n = setControl(n, "primary", "#ABCDEF");
  expect(resolveControls(n).layers[0].thresholdRules![1].color).toBe("#FFFF00");
  n = detachColorTarget(n, "primary", {
    layerId: "title-a",
    property: "color",
  });
  n = setControl(n, "primary", "#654321");
  expect(resolveControls(n).layers[0].color).toBe("#ABCDEF");
  expect(resolveControls(n).layers[1].color).toBe("#654321");
  expect(n.controls!.find((c) => c.id === "warning")!.semantic).toBe("warning");
  expect(() => validateProject(n)).not.toThrow();
  const detached = detachColorTarget(n, "warning", {
    layerId: "title-a",
    property: "thresholdRules.1.color",
  });
  expect(detached.layers[0].thresholdRules![1].color).toBe("#FFFF00");
  expect(detached.controls!.some((c) => c.id === "warning")).toBe(false);
});

test("semantic warning and danger colors follow source meaning while unrelated sources drop old ranges", () => {
  let p = fixture();
  p.layers = [
    {
      ...p.layers[0],
      kind: "metric",
      source: "heartRate",
      threshold: true,
      thresholdRules: defaultThresholds("heartRate", "#FFFFFF"),
    },
  ];
  p = createDataSlot(p, [p.layers[0].id], "Reading");
  const slot = p.controls![0];
  p.controls!.push(
    {
      id: "danger",
      label: "Danger",
      type: "color",
      semantic: "danger",
      default: "#CC1122",
      targets: [
        { layerId: p.layers[0].id, property: "thresholdRules.2.color" },
      ],
    },
    {
      id: "warning",
      label: "Warning",
      type: "color",
      semantic: "warning",
      default: "#DDAA00",
      targets: [
        { layerId: p.layers[0].id, property: "thresholdRules.1.color" },
      ],
    },
  );
  const before = JSON.stringify(p);
  expect(resolveControls(p).layers[0].thresholdRules![2].color).toBe("#CC1122");
  expect(JSON.stringify(p)).toBe(before);
  const battery = setControl(p, slot.id, "battery"),
    b = resolveControls(battery).layers[0];
  expect(b.thresholdRules![0].color).toBe("#CC1122");
  expect(b.thresholdRules![1].color).toBe("#DDAA00");
  expect(b.thresholdRules![2].color).not.toBe("#CC1122");
  const steps = setControl(battery, slot.id, "steps"),
    s = resolveControls(steps).layers[0];
  expect(s.thresholdRules).toEqual([]);
  expect(s.threshold).toBe(false);
  const source = localGenerate(battery).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source).toContain("cfg_danger");
  expect(source).toContain("cfg_warning");
  expect(source).toContain('equals("battery")');
  expect(source).toContain('equals("heartRate")');
});

test("shared-device AI mixes geometry and role edits while keeping all master and variant views coherent", () => {
  const p = enableDevices(fixture()),
    raw = JSON.stringify({
      message: "Roles",
      operations: [
        { type: "update", id: "title-a", patch: { x: 115 } },
        {
          type: "fontRole",
          action: "create",
          roleId: "ai-role",
          name: "Body",
          fontId: "sonar_label_font",
          layerIds: ["title-a"],
        },
        {
          type: "fontRole",
          action: "bind",
          roleId: "ai-role",
          layerIds: ["title-b"],
        },
        {
          type: "fontRole",
          action: "set",
          roleId: "ai-role",
          fontId: "rajdhani_light",
        },
        { type: "update", id: "title-b", patch: { y: 235 } },
      ],
    });
  const n = applyChat(p, raw).project;
  expect(() => validateProject(n)).not.toThrow();
  expect(n.fontRoles![0].layerIds).toEqual(["title-a", "title-b"]);
  expect(n.multiDevice!.master[0].x).toBe(115);
  expect(n.multiDevice!.master[1].y).toBe(235);
  expect(n.revision).toBe(p.revision + 1);
  expect(n.multiDevice!.variants[0].revision).toBe(n.revision);
});

test("113 font roles create, update, detach, undo and persist in the actual editor", async ({
  page,
}) => {
  const p = fixture();
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
  await page.getByRole("button", { name: "打开 Roles", exact: true }).click();
  await page.getByText("表盘配置", { exact: true }).click();
  await page.getByText("主题角色与关联", { exact: true }).click();
  await page.getByText("建立字体角色", { exact: true }).click();
  await page.getByLabel("字体角色名称", { exact: true }).fill("正文");
  await page.getByLabel("绑定字体角色 Title A", { exact: true }).check();
  await page.getByLabel("绑定字体角色 Title B", { exact: true }).check();
  await page.getByRole("button", { name: "建立字体关联", exact: true }).click();
  await page
    .getByLabel("字体角色 正文", { exact: true })
    .selectOption("rajdhani_light");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const dump = async () => {
    const wait = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出项目", exact: true }).click();
    return JSON.parse(await readFile((await (await wait).path())!, "utf8"));
  };
  let saved = await dump();
  expect(saved.fontRoles[0].fontId).toBe("rajdhani_light");
  expect(saved.fontRoles[0].layerIds).toEqual(p.layers.map((l) => l.id));
  await page.getByText("表盘配置", { exact: true }).click();
  await page.locator(".layer-row").filter({ hasText: "Title A" }).click();
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await expect(page.getByText(/此控件跟随字体角色/)).toBeVisible();
  await page
    .getByRole("button", { name: "应用等宽科技字", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  saved = await dump();
  expect(saved.fontRoles[0].layerIds).toEqual(["title-b"]);
  expect(saved.layers[0].customFont.id).toBe("sonar_number_font");
  await page.getByTitle("撤销", { exact: true }).click();
  saved = await dump();
  expect(saved.fontRoles[0].layerIds).toEqual(["title-a", "title-b"]);
  await page.getByTitle("重做", { exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 Roles", exact: true }).click();
  saved = await dump();
  expect(saved.fontRoles[0].layerIds).toEqual(["title-b"]);
  expect(saved.schemaVersion).toBe(49);
});
for (const key of ["venu445mm", "venu441mm"])
  test(
    "appearance role and semantic color SDK " + key,
    async ({ page, request }) => {
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
            entry: "frontend/tests/fixtures/roleHarness.ts",
            name: "GfcRoleHarness",
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
        const h = (window as any).gfcRoles,
          p = await h.fixture(key);
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
    },
  );

test("113 color role classification and detachment preserve an independent literal color", async ({
  page,
}) => {
  const p = fixture();
  p.name = "ColorRoles";
  p.controls = [
    {
      id: "primary",
      label: "Primary",
      type: "color",
      default: "#123456",
      targets: p.layers.map((l) => ({ layerId: l.id, property: "color" })),
    },
  ];
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
    .getByRole("button", { name: "打开 ColorRoles", exact: true })
    .click();
  await page.getByText("表盘配置", { exact: true }).click();
  await page.getByLabel("Primary", { exact: true }).fill("#abcdef");
  await page.getByText("主题角色与关联", { exact: true }).click();
  await page.getByText("Primary · 固定颜色", { exact: true }).click();
  await page
    .getByLabel("Primary颜色用途", { exact: true })
    .selectOption("accent");
  await page
    .getByRole("button", {
      name: "解除颜色关联 primary title-a color",
      exact: true,
    })
    .click();
  await page.getByLabel("Primary", { exact: true }).fill("#654321");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await wait).path())!, "utf8"),
  );
  expect(saved.layers[0].color.toUpperCase()).toBe("#ABCDEF");
  expect(saved.controls[0].semantic).toBe("accent");
  expect(saved.controls[0].targets).toEqual([
    { layerId: "title-b", property: "color" },
  ]);
  expect(saved.controlValues.primary.toUpperCase()).toBe("#654321");
  expect(() => validateProject(saved)).not.toThrow();
});
