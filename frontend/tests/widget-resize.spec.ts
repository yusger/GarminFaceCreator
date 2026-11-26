import { resizeModelLayers } from "../src/selection";
import { project, validateProject, type Layer } from "../src/domain";
import { insertWidget, isDamagedWidget, rebuildWidget } from "../src/widgets";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const cases = [
  ["capsule-metric", 5],
  ["segment-battery", 6],
  ["vitals-column", 16],
  ["stack-tiers", 9],
] as const;
for (const [id, count] of cases)
  test(
    "composite resize handles and empty-area drag preserve " + id,
    async ({ page }) => {
      page.on("dialog", (d) => d.accept("Resize-" + id));
      await page.goto("/");
      await page.getByRole("button", { name: /^空白画布/ }).click();
      await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
      await page.getByRole("button", { name: "创建项目", exact: true }).click();
      await page.getByRole("button", { name: "素材", exact: true }).click();
      await page.getByText("自定义控件", { exact: true }).click();
      await page.getByLabel("自定义控件样式").selectOption(id);
      await page.getByRole("button", { name: "添加控件", exact: true }).click();
      const parts = page.locator("svg.watch [data-widget-part]");
      await expect(parts).toHaveCount(count);
      const ratio =
        Number(await page.getByLabel("复合控件w").inputValue()) /
        Number(await page.getByLabel("复合控件h").inputValue());
      const handles = [
        ["左上缩放", -12, -10],
        ["右上缩放", 12, -10],
        ["左下缩放", -12, 10],
        ["右下缩放", 12, 10],
      ] as const;
      for (const [name, dx, dy] of handles) {
        const width = await page.getByLabel("复合控件w").inputValue();
        const box = (await page
          .getByLabel(name, { exact: true })
          .boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width / 2 + dx,
          box.y + box.height / 2 + dy,
          { steps: 3 },
        );
        await page.mouse.up();
        await expect(parts).toHaveCount(count);
        await expect(page.getByLabel("复合控件w")).not.toHaveValue(width);
        await expect(page.locator(".layer-row")).toHaveCount(1);
      }
      // The transparent hit area is a rendering aid; it must never replace the stored composite.
      const root = page
        .locator("svg.watch g[data-layer]:not([data-widget-part])")
        .first();
      const box = (await root.locator(":scope > rect").first().boundingBox())!;
      const xBefore = Number(await page.getByLabel("复合控件x").inputValue());
      await page.mouse.move(box.x + box.width / 2, box.y + 1);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 14, box.y + 8, {
        steps: 3,
      });
      await page.mouse.up();
      await expect(parts).toHaveCount(count);
      expect(Number(await page.getByLabel("复合控件x").inputValue())).not.toBe(
        xBefore,
      );
      await page.getByTitle("撤销", { exact: true }).click();
      await expect(parts).toHaveCount(count);
      await page.getByTitle("重做", { exact: true }).click();
      await expect(parts).toHaveCount(count);
      await expect(
        page.getByText("已保存到本机", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await page
        .getByRole("button", { name: "打开 Resize-" + id, exact: true })
        .click();
      await page.locator(".layer-row").first().click();
      await expect(parts).toHaveCount(count);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "导出项目", exact: true }).click();
      const data = JSON.parse(
        await readFile((await (await download).path())!, "utf8"),
      );
      expect(data.layers).toHaveLength(1);
      expect(data.layers[0].kind).toBe("widget");
      expect(data.layers[0].compound.layers).toHaveLength(count);
      expect(data.layers[0].w / data.layers[0].h).toBeCloseTo(ratio, 4);
    },
  );

function brokenProject() {
  const p = insertWidget(project("BrokenWidget", true), "capsule-metric");
  p.layers = [
    {
      ...p.layers[0],
      kind: "rect",
      compound: undefined,
      compoundOverrides: undefined,
      fillEnabled: true,
      strokeEnabled: false,
      opacity: 0,
      cornerRadius: 0,
      w: 288,
      h: 96,
    },
  ];
  return p;
}
test("known damaged placeholders rebuild explicitly with defaults and preserved geometry", () => {
  const p = brokenProject(),
    old = p.layers[0];
  old.groupId = "parent-group";
  old.groupName = "Existing group";
  old.effectPrompt = "Preserve my design intent";
  expect(isDamagedWidget(old)).toBe(true);
  const fixed = rebuildWidget(p, old.id);
  validateProject(fixed);
  expect(fixed.layers[0].id).toBe(old.id);
  expect(fixed.layers[0].compound!.layers).toHaveLength(5);
  expect(fixed.layers[0].w).toBe(288);
  expect(fixed.layers[0].h).toBe(96);
  expect(fixed.codeRevision).toBe(-1);
  expect(fixed.layers[0].groupId).toBe(old.groupId);
  expect(fixed.layers[0].effectPrompt).toBe(old.effectPrompt);
  expect(isDamagedWidget(fixed.layers[0])).toBe(false);
  expect(p.layers[0].compound).toBeUndefined();
});
test("saved blank placeholder offers default rebuild and undo keeps the original", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept());
  await page.locator('input[accept=".json"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(brokenProject())),
  });
  await page.locator(".layer-row").first().click();
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(0);
  await expect(page.getByText(/使用默认颜色和部件设置/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: "待恢复的复合控件", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".layer-row")).toContainText("待恢复");
  await page
    .getByRole("button", { name: "按默认样式重建复合控件", exact: true })
    .click();
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(5);
  await expect(page.getByLabel("复合控件w")).toHaveValue("288");
  await page.getByTitle("撤销", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "按默认样式重建复合控件", exact: true }),
  ).toBeVisible();
  await page.getByTitle("重做", { exact: true }).click();
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(5);
});

test("resize writeback discards view proxy fields and preserves the model", () => {
  const p = insertWidget(project("StrictGeometry", true), "capsule-metric"),
    root = p.layers[0];
  const proxy = {
    ...root,
    kind: "rect",
    compound: undefined,
    opacity: 0,
    x: 30,
    y: 40,
    w: 300,
    h: 100,
  };
  const next = resizeModelLayers(p.layers, root.id, proxy);
  expect(next[0].kind).toBe("widget");
  expect(next[0].compound).toBe(root.compound);
  expect(next[0].opacity).toBe(root.opacity);
  expect(next[0].x).toBe(30);
  expect(next[0].w).toBe(300);
  validateProject({ ...p, layers: next });
});
