import { test, expect } from "@playwright/test";
import { resourceInventory, encodedDataBytes } from "../src/resourceInventory";
import { layer, project } from "../src/domain";
import { png } from "../../backend/tests/image-fixture.mjs";
const image = "data:image/png;base64," + png(255, 0, 0).toString("base64");
test("inventory deduplicates bytes but preserves all current and historical references", () => {
  const p = project("Resources", true);
  const l = { ...layer("image"), image };
  p.layers = [l, { ...l, id: "second" }];
  p.assets = [{ path: "assets/shared.png", data: image }];
  p.designSnapshots = [{ id: "history", name: "Previous", at: 1, layers: [l] }];
  p.versions = [
    {
      at: 1,
      revision: 0,
      files: [],
      assets: [{ path: "assets/old.png", data: image }],
    },
  ];
  const before = JSON.stringify(p);
  const report = resourceInventory(p);
  expect(report).toHaveLength(1);
  expect(report[0].encodedBytes).toBe(png(255, 0, 0).length);
  expect(
    report[0].references.filter((r) => r.scope === "current"),
  ).toHaveLength(3);
  expect(
    report[0].references.filter((r) => r.scope === "history"),
  ).toHaveLength(2);
  expect(
    report[0].references
      .filter((r) => r.scope === "history")
      .every((r) => !r.layerId),
  ).toBe(true);
  expect(JSON.stringify(p)).toBe(before);
  p.layers = [];
  expect(
    resourceInventory(p)[0].references.filter((r) => r.scope === "history"),
  ).toHaveLength(2);
  expect(encodedDataBytes("https://example.com/picture.png")).toBeUndefined();
});
test("resource fonts are references and are not assigned invented memory sizes", () => {
  const p = project("Fonts", true);
  p.layers = [
    { ...layer("text"), garminFont: "chalkHan" },
    {
      ...layer("text"),
      customFont: { id: "test", family: "Test", file: "Test.ttf" },
    },
  ];
  expect(resourceInventory(p).map((r) => [r.kind, r.encodedBytes])).toEqual([
    ["font", undefined],
    ["font", undefined],
  ]);
});
test("local image inspection exposes pixels, alpha and size without upload", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("ResourceChecks"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", {exact:true})).toBeVisible();
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  await page
    .locator('input[hidden][type="file"][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "red.png",
      mimeType: "image/png",
      buffer: png(255, 0, 0),
    });
  await expect(page.locator("svg.watch image")).toHaveCount(1);
  await page.getByRole("button", { name: "素材", exact: true }).click();
  const report = page.locator("[data-resource-inspector]");
  await report.locator(":scope > summary").click();
  await expect(report).toContainText("32×32px");
  await expect(report).toContainText("透明像素：无");
  await expect(report).toContainText("RGBA估算 4.0 KiB");
  expect(writes).toEqual([]);
  const transparent = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 3;
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[hidden][type="file"][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "transparent.png",
      mimeType: "image/png",
      buffer: Buffer.from(transparent, "base64"),
    });
  await expect(report).toContainText("透明像素：有");
  expect(writes).toEqual([]);
});
