import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { themedFixture } from "./fixtures/themedFixture";
import {
  upgradeThemeDefinition,
  themeUpgradeBase,
  applyCheckedThemeUpgrade,
} from "../src/themeUpgrade";
import { setControl, resolveControls } from "../src/projectControls";
import { setThemeBackground, selectTheme } from "../src/themes";
import { localGenerate } from "../src/localGenerator";
import { editorFrame } from "../src/editorHistory";
function update(p: ReturnType<typeof themedFixture>) {
  const next = structuredClone(p);
  next.themes!.presets.forEach((t) => (t.version = "1.1.0"));
  next.controlValues = {};
  next.themes!.overrides = {};
  next.layers[0].y = 160;
  return next;
}
test("theme definition upgrade retains independent overrides and side-load identity while replacing design resources", () => {
  let p = themedFixture();
  const def = update(p);
  p = setControl(p, "apex-color", "#123456");
  p = setControl(p, "trail-color", "#654321");
  p = setThemeBackground(selectTheme(p, "trail"), "#223344");
  p.assets = [
    { path: "resources/drawables/old.png", data: "data:image/png;base64,AAAA" },
  ];
  const before = JSON.stringify(p),
    report = upgradeThemeDefinition(p, def),
    n = report.project;
  expect(n.id).toBe(p.id);
  expect(n.appId).toBe(p.appId);
  expect(n.name).toBe(p.name);
  expect(n.layers[0].y).toBe(160);
  expect(n.themes!.activeId).toBe("trail");
  expect(n.controlValues).toEqual(p.controlValues);
  expect(n.themes!.overrides).toEqual(p.themes!.overrides);
  expect(n.assets).toBeUndefined();
  expect(n.codeRevision).toBe(-1);
  expect(resolveControls(selectTheme(n, "apex")).layers[0].color).toBe(
    "#123456",
  );
  expect(report.retained).toHaveLength(2);
  expect(report.warnings).toEqual([]);
  expect(JSON.stringify(p)).toBe(before);
  expect(editorFrame(p).assets).toEqual(p.assets);
  expect(themeUpgradeBase(n)).not.toBe(report.base);
});
test("removed or incompatible settings and unknown active theme fall back with explicit diagnostics", () => {
  const p = themedFixture();
  p.controlValues = {
    "apex-color": "#112233",
    "trail-color": "#445566",
    removed: true,
  };
  p.themes!.activeId = "unknown";
  p.themes!.overrides = {
    gone: { backgroundColor: "#123456" },
    apex: { backgroundColor: "#112233" },
  };
  const def = update(themedFixture());
  def.appId = p.appId;
  def.controls![0] = {
    ...def.controls![0],
    id: "apex-visible",
    type: "boolean",
    default: true,
    targets: [{ layerId: "apex-time", property: "activeVisible" }],
  };
  def.themes!.presets[0].controlIds = ["apex-visible"];
  const r = upgradeThemeDefinition(p, def);
  expect(r.project.controlValues).toEqual({ "trail-color": "#445566" });
  expect(r.project.themes!.activeId).toBe("apex");
  expect(r.project.themes!.overrides).toEqual({
    apex: { backgroundColor: "#112233" },
  });
  expect(r.warnings).toHaveLength(4);
});
test("identity mismatch, downgrades, no newer version, locks, targets and invalid resources fail without mutation", () => {
  const p = themedFixture(),
    snapshot = JSON.stringify(p);
  const bad = update(p);
  bad.appId = "0".repeat(32);
  expect(() => upgradeThemeDefinition(p, bad)).toThrow(/身份/);
  expect(() => upgradeThemeDefinition(p, p)).toThrow(/更高版本/);
  const lower = update(p);
  lower.themes!.presets[0].version = "0.9.0";
  expect(() => upgradeThemeDefinition(p, lower)).toThrow(/降级/);
  const size = update(p);
  size.target = "venu441mm";
  size.deviceSize = "41mm";
  expect(() => upgradeThemeDefinition(p, size)).toThrow(/型号和尺寸/);
  const lock = structuredClone(p);
  lock.layers[0].locked = true;
  expect(() => upgradeThemeDefinition(lock, update(lock))).toThrow(/锁定/);
  const missing = update(p);
  missing.layers[0].customFont = {
    id: "local_" + "a".repeat(32),
    family: "missing",
    file: "local_" + "a".repeat(32) + ".ttf",
  };
  expect(() => upgradeThemeDefinition(p, missing)).toThrow(/字体/);
  expect(JSON.stringify(p)).toBe(snapshot);
});
test("control ownership changes cannot carry overrides across themes", () => {
  const p = themedFixture();
  p.controlValues = { "apex-color": "#123456" };
  const def = update(p);
  def.controls = [
    {
      ...def.controls![0],
      targets: [{ layerId: "trail-time", property: "color" }],
    },
  ];
  def.themes!.presets[0].controlIds = [];
  def.themes!.presets[1].controlIds = ["apex-color"];
  const result = upgradeThemeDefinition(p, def);
  expect(result.project.controlValues).toEqual({});
  expect(result.warnings.join(" ")).toContain("apex-color");
});
test("removed source choices fall back instead of reinterpreting stable selections", () => {
  const p = themedFixture();
  p.layers[0].kind = "metric";
  p.layers[0].source = "heartRate";
  p.controls!.push({
    id: "apex-source",
    label: "Data",
    type: "dataSource",
    default: "heartRate",
    options: ["heartRate", "steps", "battery"],
    targets: [{ layerId: "apex-time", property: "source" }],
  });
  p.themes!.presets[0].controlIds.push("apex-source");
  p.controlValues = { "apex-source": "steps" };
  const def = update(p);
  def.controls!.find((c) => c.id === "apex-source")!.options = [
    "battery",
    "heartRate",
  ];
  const result = upgradeThemeDefinition(p, def);
  expect(result.project.controlValues).toEqual({});
  expect(resolveControls(result.project).layers[0].source).toBe("heartRate");
  expect(result.warnings.join(" ")).toContain("apex-source");
});
test("native property identities remain stable after definition versions and default colours change", () => {
  const p = themedFixture();
  p.controlValues = { "apex-color": "#123456" };
  const def = update(p);
  def.controls![0].default = "#667788";
  const n = upgradeThemeDefinition(p, def).project;
  const a = localGenerate(p),
    b = localGenerate(n),
    prop = (files: typeof a) =>
      files.find((f) => f.path.endsWith("properties.xml"))!.content;
  expect(prop(b)).toContain('id="Gfc_apex_color"');
  expect(prop(b)).toContain("0x123456");
  expect(prop(a).match(/id="Gfc_Theme"/g)).toEqual(
    prop(b).match(/id="Gfc_Theme"/g),
  );
  expect(b.find((f) => f.path === "manifest.xml")!.content).toContain(p.appId);
});
test("editor checks updates before applying and can undo, save and reopen with overrides intact", async ({
  page,
}) => {
  const p = themedFixture();
  p.controlValues = { "apex-color": "#123456", "trail-color": "#654321" };
  const def = update(p);
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
    .getByRole("button", { name: "打开 ThemeFixture", exact: true })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: /^表盘配置$/ })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: /^更新主题定义$/ })
    .click();
  await page.getByLabel("检查主题更新", { exact: true }).setInputFiles({
    name: "update.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(def)),
  });
  await expect(page.getByRole("group", { name: "主题更新预检" })).toContainText(
    "1.0.0 → 1.1.0",
  );
  await expect(page.getByRole("group", { name: "主题更新预检" })).toContainText(
    "保留 2 项",
  );
  await page.getByRole("button", { name: "应用主题更新", exact: true }).click();
  await expect(
    page.getByText("主题定义已更新，兼容自定义值已保留", { exact: true }),
  ).toBeVisible();
  const dump = async () => {
    const d = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出项目", exact: true }).click();
    return JSON.parse(await readFile((await (await d).path())!, "utf8"));
  };
  let saved = await dump();
  expect(saved.appId).toBe(p.appId);
  expect(saved.themes.presets[0].version).toBe("1.1.0");
  expect(saved.controlValues).toEqual(p.controlValues);
  await page.getByTitle("撤销", { exact: true }).click();
  saved = await dump();
  expect(saved.themes.presets[0].version).toBe("1.0.0");
  expect(saved.controlValues).toEqual(p.controlValues);
  await page.getByTitle("重做", { exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 ThemeFixture", exact: true })
    .click();
  saved = await dump();
  expect(saved.themes.presets[0].version).toBe("1.1.0");
  expect(saved.controlValues).toEqual(p.controlValues);
});

test("applying checked design retains newer project metadata and refuses intervening design edits", () => {
  const p = themedFixture(),
    checked = upgradeThemeDefinition(p, update(p));
  const latest = {
    ...p,
    name: "Renamed after check",
    files: [{ path: "source/Recent.mc", content: "// retained history" }],
  };
  const result = applyCheckedThemeUpgrade(latest, checked);
  expect(result.name).toBe(latest.name);
  expect(result.files).toEqual(latest.files);
  expect(result.codeRevision).toBe(-1);
  expect(() =>
    applyCheckedThemeUpgrade(setControl(p, "apex-color", "#123456"), checked),
  ).toThrow(/重新检查/);
  expect(p.themes!.presets[0].version).toBe("1.0.0");
});
