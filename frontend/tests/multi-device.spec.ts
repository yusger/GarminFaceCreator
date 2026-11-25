import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { devices } from "../src/devices";
import {
  enableDevices,
  addDevice,
  selectDevice,
  deviceKey,
  reconcileDevices,
  resetDevice,
  projectForDevice,
} from "../src/multiDevice";
import { localGenerate, LOCAL_PROVENANCE } from "../src/localGenerator";
import { addCodeVersion } from "../src/history";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
const small = devices.find((d) => d.id === "venu441mm")!;
function seed() {
  const p = project("MultiDevice", true);
  p.layers = [{ ...layer("time"), x: 60, y: 180, w: 330, h: 80, size: 60 }];
  return p;
}
test("shared design propagates except overridden attributes, device code stays isolated and reset resumes inheritance", () => {
  let p = enableDevices(seed());
  const large = deviceKey(p);
  p = addCodeVersion(p, localGenerate(p), LOCAL_PROVENANCE);
  p = addDevice(p, small);
  expect(p.files).toEqual([]);
  const little = deviceKey(p);
  p = reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l) => ({ ...l, x: 80, color: "#ff0000" })),
    revision: p.revision + 1,
  })!;
  p = reconcileDevices(
    p,
    addCodeVersion(p, localGenerate(p), LOCAL_PROVENANCE),
  )!;
  expect(p.codeRevision).toBe(p.revision);
  p = selectDevice(p, large, "master");
  expect(p.layers[0].x).toBe(60);
  p = reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l) => ({ ...l, x: 100, size: 55 })),
    revision: p.revision + 1,
  })!;
  p = selectDevice(p, little, "device");
  expect(p.layers[0].x).toBe(80);
  expect(p.layers[0].size).toBe(55);
  expect(p.codeRevision).not.toBe(p.revision);
  p = resetDevice(p);
  expect(p.layers[0].x).toBe(100);
  expect(p.layers[0].color).not.toBe("#ff0000");
  expect(
    selectDevice(p, large, "device").files.find(
      (f) => f.path === "manifest.xml",
    )!.content,
  ).toContain("venu445mm");
  expect(projectForDevice(p, little).target).toBe("venu441mm");
  expect(p.appId).toBe(projectForDevice(p, large).appId);
});
test("device editing refuses topology and binding edits, master drag frames remain coherent, and variants are unique", () => {
  let p = addDevice(enableDevices(seed()), small);
  expect(addDevice(p, small).multiDevice!.variants).toHaveLength(2);
  expect(() => reconcileDevices(p, { ...p, layers: [] })).toThrow(/共享主设计/);
  expect(() =>
    reconcileDevices(p, {
      ...p,
      layers: p.layers.map((l) => ({ ...l, timePart: "HH" })),
    }),
  ).toThrow(/共享主设计/);
  p = selectDevice(p, deviceKey(p), "master");
  const dragStart = p;
  const frame1 = reconcileDevices(p, {
    ...dragStart,
    layers: dragStart.layers.map((l) => ({ ...l, x: 65 })),
  })!;
  const frame2 = reconcileDevices(frame1, {
    ...dragStart,
    layers: dragStart.layers.map((l) => ({ ...l, x: 70 })),
    revision: p.revision + 1,
  })!;
  expect(frame2.multiDevice!.master[0].x).toBe(70);
});
test("multi-device import validates nested designs and remaps identities while discarding every target's code", () => {
  let p = addDevice(enableDevices(seed()), small);
  p = reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l) => ({ ...l, x: 85 })),
    revision: 1,
  })!;
  p = reconcileDevices(
    p,
    addCodeVersion(p, localGenerate(p), LOCAL_PROVENANCE),
  )!;
  const copy = validateProject(JSON.parse(JSON.stringify(p)));
  expect(copy.id).not.toBe(p.id);
  expect(copy.appId).not.toBe(p.appId);
  expect(
    copy.multiDevice!.variants.every(
      (v) => v.code.files.length === 0 && v.code.codeRevision === -1,
    ),
  ).toBe(true);
  expect(copy.multiDevice!.master[0].id).toBe(copy.layers[0].id);
  expect(copy.multiDevice!.master[0].id).not.toBe(p.layers[0].id);
  expect(selectDevice(copy, deviceKey(copy), "device").layers[0].x).toBe(85);
  const bad = structuredClone(p);
  bad.multiDevice!.variants[0].overrides[bad.layers[0].id] = { x: NaN };
  expect(() => validateProject(bad)).toThrow(/微调/);
  const foreign = structuredClone(p);
  foreign.multiDevice!.variants[0].overrides.bad = { x: 1 };
  expect(() => validateProject(foreign)).toThrow(/微调/);
  const invalid = structuredClone(p);
  invalid.multiDevice!.master[0].color = "bad";
  expect(() => validateProject(invalid)).toThrow(/图层/);
});
test("design snapshots restore the entire adaptation design and cannot restore stale target source", () => {
  let p = addDevice(enableDevices(seed()), small);
  p = saveDesignSnapshot(p, "two devices");
  const snap = p.designSnapshots![0].id;
  p = reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l) => ({ ...l, x: 90 })),
    revision: 1,
  })!;
  const restored = restoreDesignSnapshot(p, snap);
  expect(restored.multiDevice!.variants).toHaveLength(2);
  expect(restored.layers[0].x).toBe(60);
  expect(restored.codeRevision).toBe(-1);
  expect(
    restored.multiDevice!.variants.every((v) => v.code.codeRevision === -1),
  ).toBe(true);
});
test("multi-device editor persists per-device changes and compiles both target PRGs through the remote compiler", async ({
  page,
}) => {
  test.setTimeout(180000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  page.on("dialog", (d) => d.accept("MultiDevice"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByRole("button", { name: "适配设备", exact: true }).click();
  await page
    .getByRole("button", { name: "启用多设备适配", exact: true })
    .click();
  await page
    .getByLabel("添加适配设备", { exact: true })
    .selectOption("venu441mm:41mm");
  await page.getByRole("button", { name: "添加并预览", exact: true }).click();
  await expect(page.locator(".device")).toContainText("390");
  await page.getByLabel("适配编辑范围", { exact: true }).selectOption("master");
  await expect(page.locator(".adaptation-panel")).toContainText("共享图层");
  await page.getByRole("button", { name: /^适配设备/ }).click();
  await page
    .getByRole("button", { name: "生成全部设备代码", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("全部设备代码已分别生成");
  await page.getByRole("button", { name: "编译全部设备", exact: true }).click();
  const results = page.getByLabel("多设备编译结果", { exact: true });
  await expect(results.locator("li")).toHaveCount(2, { timeout: 120000 });
  await expect(
    results.locator("li").filter({ hasText: "succeeded" }),
  ).toHaveCount(2);
  await expect(results.locator("a")).toHaveCount(2);
  await expect(results).toContainText("Venu4_45mm_MultiDevice.prg");
  await expect(results).toContainText("Venu4_41mm_MultiDevice.prg");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/multi-device-build.png" });
  await page.reload();
  await page
    .getByRole("button", { name: "打开 MultiDevice", exact: true })
    .click();
  await page.getByRole("button", { name: /^适配设备/ }).click();
  await expect(
    page.getByLabel("适配预览设备", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await expect(page.locator(".adaptation-panel")).toContainText("succeeded");
  await page
    .getByLabel("适配预览设备", { exact: true })
    .selectOption("venu445mm:45mm");
  await expect(page.locator(".device")).toContainText("454");
  await page.screenshot({ path: "docs/screenshots/multi-device-editor.png" });
});
