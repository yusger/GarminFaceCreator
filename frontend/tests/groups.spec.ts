import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { layer } from "../src/domain";
import { organizeReferenceLayers, renderChanged } from "../src/groups";
test("organizational groups preserve bindings order and native render identity", () => {
  const layers = [
    { ...layer("metric"), source: "battery", name: "电量" },
    { ...layer("line"), name: "天光外圈 1" },
  ];
  const grouped = organizeReferenceLayers(layers);
  expect(grouped.map((l) => l.id)).toEqual(layers.map((l) => l.id));
  expect(grouped[0].source).toBe("battery");
  expect(renderChanged(layers, grouped)).toBe(false);
  expect(
    renderChanged(
      grouped,
      grouped.map((l) => ({ ...l, color: "#112233" })),
    ),
  ).toBe(true);
});
async function exported(page: any) {
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  return JSON.parse(await readFile((await (await wait).path())!, "utf8"));
}
test("group collapse thumbnails palette and undo preserve member properties", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("分组测试"));
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  for (const name of ["矩形A", "矩形B"]) {
    await page.getByRole("button", { name: "矩形", exact: true }).click();
    await page.getByLabel("图层名称", { exact: true }).fill(name);
    await page.getByLabel("图层名称", { exact: true }).blur();
  }
  const before = await exported(page);
  await page.locator(".layer-row").filter({ hasText: "矩形A" }).click();
  await page
    .locator(".layer-row")
    .filter({ hasText: "矩形B" })
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "选中图层分组", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "选择分组 分组测试", exact: true }),
  ).toBeVisible();
  let p = await exported(page);
  expect(p.revision).toBe(before.revision);
  expect(new Set(p.layers.map((l: any) => l.groupId)).size).toBe(1);
  await expect(page.locator(".layer-thumbnail")).toHaveCount(2);
  await page
    .getByRole("button", { name: "折叠分组 分组测试", exact: true })
    .click();
  await expect(page.locator(".layer-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "展开分组 分组测试", exact: true })
    .click();
  await page
    .getByRole("button", { name: "选择分组 分组测试", exact: true })
    .click();
  await page.getByText("批量基础配色", { exact: true }).click();
  await page.getByLabel("目标基础色", { exact: true }).fill("#112233");
  await page.getByRole("button", { name: "应用配色", exact: true }).click();
  p = await exported(page);
  expect(p.layers.map((l: any) => l.color)).toEqual(["#112233", "#112233"]);
  expect(p.layers.map((l: any) => l.source)).toEqual(
    before.layers.map((l: any) => l.source),
  );
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  p = await exported(page);
  expect(p.layers.map((l: any) => l.color)).toEqual(
    before.layers.map((l: any) => l.color),
  );
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.locator(".layer-group")).toHaveCount(0);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "选择分组 分组测试", exact: true }),
  ).toBeVisible();
});
test("new reference copies organize large layer lists without invalidating native code", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "使用 SkyRing", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(159);
  await expect(page.locator(".drawer-caption")).toContainText("与设计一致");
  await page
    .getByRole("button", { name: "折叠分组 天光外圈", exact: true })
    .click();
  await expect(page.locator(".layer-row")).toHaveCount(87);
  await page
    .getByRole("button", { name: "展开分组 天光外圈", exact: true })
    .click();
  await page
    .getByRole("button", { name: "选择分组 天光外圈", exact: true })
    .click();
  await expect(page.getByLabel("已选图层数", { exact: true })).toContainText(
    "72",
  );
  await expect(page.locator(".drawer-caption")).toContainText("与设计一致");
});
