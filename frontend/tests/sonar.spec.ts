import { enableDevices, addDevice, selectDevice } from "../src/multiDevice";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
import { resetControls } from "../src/projectControls";
import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolveControls,
  setControl,
  validateControls,
} from "../src/projectControls";
import { validateProject, type Project } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { chalkPlans } from "../src/chalkFonts";
async function canonical() {
  const p = JSON.parse(
    await readFile("default-watchfaces/sonar/design.json", "utf8"),
  ) as Project;
  const ref = JSON.parse(
    await readFile("default-watchfaces/sonar/reference.json", "utf8"),
  );
  for (const a of ref.images)
    p.layers.find((l) => l.id === a.layerId)!.image =
      "data:image/png;base64," +
      (await readFile("default-watchfaces/sonar/" + a.file)).toString("base64");
  return p;
}
test("SONAR source settings preserve defaults, resolve distance precisely, and restore progress without mutating the design", async () => {
  const p = await canonical(),
    before = JSON.stringify(p),
    changed = setControl(p, "right-slot-source", "distance"),
    resolved = resolveControls(changed);
  expect(
    resolved.layers.find((l) => l.id === "sonar_steps_value"),
  ).toMatchObject({ source: "distance", precision: 2 });
  expect(resolved.layers.find((l) => l.id === "sonar_steps_label")!.text).toBe(
    "km",
  );
  expect(
    resolved.layers.find((l) => l.id === "sonar_steps_progress")!.activeVisible,
  ).toBe(false);
  const restored = resolveControls(
    setControl(changed, "right-slot-source", "steps"),
  );
  expect(
    restored.layers.find((l) => l.id === "sonar_steps_progress")!.activeVisible,
  ).toBe(true);
  expect(restored.layers.find((l) => l.id === "sonar_steps_label")!.text).toBe(
    "steps",
  );
  expect(JSON.stringify(p)).toBe(before);
  expect(
    resolveControls(setControl(p, "show-seconds", false))
      .layers.filter((l) =>
        ["sonar_digital_second", "sonar_analog_second"].includes(l.id),
      )
      .every((l) => l.activeVisible === false),
  ).toBe(true);
});
test("SONAR conversion preserves generic fonts, native controls, continuous progress and imported ID relationships", async () => {
  const p = await canonical();
  validateControls(p);
  const code = localGenerate(p),
    source = code.find((f) => f.path === "source/App.mc")!.content;
  expect(source).toContain("var ratio=0.0");
  expect(source).toContain("dateMonthDayWeek");
  expect(source).toContain("cfg_right_slot_source");
  expect(source).toContain("datadistance");
  expect(source).toContain("Application.Properties.getValue");
  expect(code.some((f) => f.path === "resources/settings/settings.xml")).toBe(
    true,
  );
  expect(chalkPlans(p).every((f) => f.font.startsWith("sonar-"))).toBe(true);
  const imported = validateProject(p);
  expect(imported.id).not.toBe(p.id);
  expect(() => validateControls(imported)).not.toThrow();
  expect(imported.layers.find((l) => l.sourceLabelFor)?.sourceLabelFor).toBe(
    imported.layers.find((l) => l.source === "steps" && l.kind === "metric")!
      .id,
  );
  const bad = structuredClone(p);
  bad.controls![0].targets[0].layerId = "unknown";
  expect(() => validateControls(bad)).toThrow();
  const same = setControl(
    setControl(p, "hr-normal-color", "#FF6B6B"),
    "hr-warning-color",
    "#FF6B6B",
  );
  const shared = localGenerate(same).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(shared).toContain("ink=cfg_hr_normal_color");
  expect(shared).toContain("ink=cfg_hr_warning_color");
});
test("SONAR shared controls survive snapshots and import, and reset invalidates every device target", async () => {
  let p = await canonical();
  p = selectDevice(
    addDevice(enableDevices(p), "venu441mm", "41mm"),
    "venu441mm:41mm",
    "master",
  );
  p = setControl(p, "right-slot-source", "distance");
  p = saveDesignSnapshot(p, "distance");
  const id = p.activeDesignSnapshot!;
  const snapshot = restoreDesignSnapshot(
    setControl(p, "right-slot-source", "steps"),
    id,
  );
  expect(
    resolveControls(snapshot).layers.find((l) => l.id === "sonar_steps_value")!
      .source,
  ).toBe("distance");
  const imported = validateProject(snapshot);
  expect(() =>
    validateControls({ ...imported, layers: imported.multiDevice!.master }),
  ).not.toThrow();
  const reset = resetControls(snapshot);
  expect(
    resolveControls(reset).layers.find((l) => l.id === "sonar_steps_value")!
      .source,
  ).toBe("steps");
  expect(
    reset.multiDevice!.variants.every((v) => v.code.codeRevision === -1),
  ).toBe(true);
  const code = localGenerate(reset);
  expect(
    code.find((f) => f.path === "resources/settings/properties.xml")!.content,
  ).toContain(
    '<property id="Gfc_right_slot_source" type="number">0</property>',
  );
});
function unzip(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      n = bytes.readUInt16LE(offset + 26),
      e = bytes.readUInt16LE(offset + 28),
      start = offset + 30 + n + e;
    files.set(
      bytes.subarray(offset + 30, offset + 30 + n).toString(),
      bytes.subarray(start, start + size),
    );
    offset = start + size;
  }
  return files;
}
test("SONAR protected copy previews settings, reloads, exports full sources and compiles on both sizes", async ({
  page,
}) => {
  test.setTimeout(300000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  const card = page.locator(".reference-card").filter({
    has: page.getByRole("button", { name: "使用 SONAR", exact: true }),
  });
  await expect(card.locator(".authorship-badge")).toHaveText("自主");
  await expect(
    page.getByRole("button", { name: "删除 SONAR", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "使用 SONAR", exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(18);
  page.once("dialog", (d) => d.accept("SONAR"));
  await page.locator(".project-title button").click();
  page.on("dialog", (d) => d.accept());
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".watchface-controls summary").click();
  await page.getByLabel("右侧数据", { exact: true }).selectOption("distance");
  const scene = page.locator(".canvas-space svg.watch");
  await expect(scene.locator('[data-layer="sonar_steps_value"]')).toContainText(
    "6.42",
  );
  await expect(scene.locator('[data-layer="sonar_steps_label"]')).toContainText(
    "km",
  );
  await expect(
    scene.locator('[data-layer="sonar_steps_progress"]'),
  ).toHaveCount(0);
  await page.getByLabel("显示秒针及数字秒", { exact: true }).uncheck();
  await expect(scene.locator('[data-layer="sonar_analog_second"]')).toHaveCount(
    0,
  );
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 SONAR", exact: true }).click();
  await page.locator(".watchface-controls summary").click();
  await expect(page.getByLabel("右侧数据", { exact: true })).toHaveValue(
    "distance",
  );
  await page.getByLabel("右侧数据", { exact: true }).selectOption("steps");
  await page.getByLabel("显示秒针及数字秒", { exact: true }).check();
  await expect(
    scene.locator('[data-layer="sonar_steps_progress"]'),
  ).toHaveCount(1);
  await page.locator(".watchface-controls summary").click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const exportZip = async () => {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
      .click();
    return readFile((await (await download).path())!);
  };
  const directory = join(tmpdir(), "gfc-sonar");
  await mkdir(directory, { recursive: true });
  const bytes = await exportZip();
  await writeFile(join(directory, "source.zip"), bytes);
  const files = unzip(bytes);
  expect(files.has("resources/settings/settings.xml")).toBe(true);
  expect(
    JSON.parse(files.get("design-source.json")!.toString()).controls,
  ).toHaveLength(12);
  expect(files.has("source-assets/fonts/sonar-number-font.ttf")).toBe(true);
  expect(files.has("notices/SONAR-DESIGN-NOTICE.md")).toBe(true);
  async function compile(zip: Buffer, target: string, size: string) {
    const map = unzip(zip),
      meta = JSON.parse(map.get("gfc-export.json")!.toString()),
      form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: meta.projectId,
        projectName: "SONAR",
        appId: meta.appId,
        target,
        deviceSize: size,
        revision: meta.designRevision,
      }),
    );
    for (const [name, data] of map)
      if (
        /^(manifest\.xml|monkey\.jungle|source\/.*\.mc|resources\/.*\.(xml|svg|fnt|png)|assets\/.*\.png)$/.test(
          name,
        )
      )
        form.append("files", new Blob([data]), name);
    const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(r.status, await r.clone().text()).toBe(202);
    const job = await r.json();
    for (let i = 0; i < 180; i++) {
      const state = await (
        await fetch(process.env.GFC_TEST_URL + "/api/builds/" + job.buildId)
      ).json();
      if (
        ["succeeded", "failed", "cancelled", "interrupted"].includes(
          state.status,
        )
      ) {
        expect(
          state.status,
          await (
            await fetch(
              process.env.GFC_TEST_URL + "/api/builds/" + job.buildId + "/logs",
            )
          ).text(),
        ).toBe("succeeded");
        await writeFile(
          join(directory, target + ".prg"),
          Buffer.from(
            await (
              await fetch(process.env.GFC_TEST_URL + state.artifacts[0].url)
            ).arrayBuffer(),
          ),
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw Error("Compile timeout");
  }
  await compile(bytes, "venu445mm", "45mm");
  await page.screenshot({ path: "docs/screenshots/sonar-editor.png" });
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await dialog.getByLabel("实时模拟", { exact: true }).uncheck();
  await dialog.getByLabel("预览日期", { exact: true }).fill("2026-11-25");
  await dialog.getByLabel("模拟时间", { exact: true }).fill("10:24");
  const seconds = dialog.getByLabel("模拟秒数", { exact: true });
  await seconds.focus();
  await seconds.press("Home");
  for (let i = 0; i < 7; i++) await seconds.press("ArrowRight");
  await dialog.getByLabel("模拟心率", { exact: true }).fill("72");
  await dialog.getByLabel("模拟步数", { exact: true }).fill("8420");
  await dialog.getByLabel("模拟电量", { exact: true }).fill("86");
  await dialog.getByLabel("预览显示模式", { exact: true }).selectOption("亮屏");
  await page.screenshot({ path: "docs/screenshots/sonar-active.png" });
  await dialog.getByLabel("预览显示模式", { exact: true }).selectOption("息屏");
  await expect(
    dialog.locator('[data-layer="sonar_battery_label"]'),
  ).toHaveCount(1);
  await expect(dialog.locator('[data-layer="sonar_scan_beam"]')).toHaveCount(0);
  await page.screenshot({ path: "docs/screenshots/sonar-aod.png" });
  await dialog.getByRole("button", { name: "关闭预览", exact: true }).click();
  await page.getByRole("button", { name: "适配设备", exact: true }).click();
  await page
    .getByRole("button", { name: "启用多设备适配", exact: true })
    .click();
  await page
    .getByLabel("添加适配设备", { exact: true })
    .selectOption("venu441mm:41mm");
  await page.getByRole("button", { name: "添加并预览", exact: true }).click();
  await page.getByRole("button", { name: /^适配设备/ }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await compile(await exportZip(), "venu441mm", "41mm");
});
