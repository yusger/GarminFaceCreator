import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { project, layer, validateProject } from "../src/domain";
import { migrateProject } from "../src/migrations";
import { imageAssetPath, binaryAssets } from "../src/assets";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
test("sequential migration preserves native identities and stable shared image references", () => {
  const old = {
    ...project(),
    schemaVersion: 1 as const,
    layers: [{ ...layer("image"), image: "data:image/png;base64,AAAA" }],
  };
  const migrated = migrateProject(old);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.layers[0].id).toBe(old.layers[0].id);
  expect(imageAssetPath(migrated.layers[0])).toBe(
    "assets/" + old.layers[0].id + ".png",
  );
  expect(migrateProject(migrated)).toEqual(migrated);
  expect(() => migrateProject({ ...old, schemaVersion: 99 })).toThrow(/版本/);
  const copy = validateProject(migrated);
  expect(copy.layers[0].id).not.toBe(migrated.layers[0].id);
  expect(copy.layers[0].assetId).toBe(migrated.layers[0].assetId);
  expect(
    binaryAssets({
      ...copy,
      layers: [...copy.layers, { ...copy.layers[0], id: "duplicate" }],
    }),
  ).toHaveLength(1);
  expect(() =>
    binaryAssets({
      ...copy,
      layers: [
        ...copy.layers,
        { ...copy.layers[0], id: "duplicate", image: "different" },
      ],
    }),
  ).toThrow();
});
test("design snapshots restore resources and device but invalidate native code", () => {
  const p = project();
  p.target = "venu441mm";
  p.deviceSize = "41mm";
  p.layers = [
    {
      ...layer("image"),
      assetId: "stable",
      image: "data:image/png;base64,AAAA",
    },
  ];
  p.assets = [
    { path: "resources/background.png", data: "data:image/png;base64,AAAA" },
  ];
  p.files = [{ path: "source/App.mc", content: "// native" }];
  p.codeRevision = p.revision;
  const snapshot = saveDesignSnapshot(p, "original");
  const changed = {
    ...snapshot,
    target: "venu445mm",
    deviceSize: "45mm",
    layers: [],
    assets: [],
    revision: 5,
  };
  const restored = restoreDesignSnapshot(
    changed,
    snapshot.designSnapshots![0].id,
  );
  expect(restored.layers).toEqual(p.layers);
  expect(restored.assets).toEqual(p.assets);
  expect(restored.target).toBe("venu441mm");
  expect(restored.deviceSize).toBe("41mm");
  expect(restored.revision).toBe(6);
  expect(restored.codeRevision).toBe(-1);
  expect(restored.files).toEqual(p.files);
  expect(restored.layers).not.toBe(snapshot.designSnapshots![0].layers);
});
test("import cancellation preserves current project and confirmation explains code/snapshot discard", async ({
  page,
}) => {
  await page.goto("/");
  page.once("dialog", (d) => d.accept("保留项目"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const incoming = project("导入项目");
  incoming.files = [{ path: "source/App.mc", content: "// discarded" }];
  const upload = {
    name: "import.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(incoming)),
  };
  let question = "";
  page.once("dialog", async (d) => {
    question = d.message();
    await d.dismiss();
  });
  await page.locator('input[accept=".json"]').setInputFiles(upload);
  await expect.poll(() => question).toContain("代码快照");
  await expect(
    page.getByRole("button", { name: "保留项目", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.locator('input[accept=".json"]').setInputFiles(upload);
  await expect(
    page.getByRole("button", { name: "导入项目", exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const value = JSON.parse(
    await readFile((await (await pending).path())!, "utf8"),
  );
  expect(value.files).toEqual([]);
  expect(value.versions).toEqual([]);
  expect(value.schemaVersion).toBe(2);
});
test("named design snapshot can be restored independently of code history", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "设计A" : ""));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "矩形", exact: true }).click();
  await page.getByLabel("图层名称").fill("快照前的图层");
  await page.getByLabel("图层名称").blur();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await page.getByRole("button", { name: "保存设计快照", exact: true }).click();
  await page.getByLabel("图层名称").fill("快照后的图层");
  await page.getByLabel("图层名称").blur();
  await page
    .getByRole("button", { name: "恢复设计快照 设计A", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const value = JSON.parse(
    await readFile((await (await pending).path())!, "utf8"),
  );
  expect(value.layers.at(-1).name).toBe("快照前的图层");
  expect(value.codeRevision).toBe(-1);
  expect(value.designSnapshots).toHaveLength(1);
});
