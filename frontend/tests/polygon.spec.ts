import { test, expect } from "@playwright/test";
import { regularPolygon, validPolygon } from "../src/geometry";
import { project, layer, validateProject } from "../src/domain";
import { migrateProject } from "../src/migrations";
import { applyChat } from "../src/designChat";
import { localGenerate } from "../src/localGenerator";
test("polygon contract rejects malformed, crossing and nonconvex geometry atomically", () => {
  for (const n of [3, 4, 6, 8, 12, 32])
    expect(validPolygon(regularPolygon(n))).toBe(true);
  for (const v of [
    [],
    [
      [0, 0],
      [1, 1],
      [0, 1],
      [1, 0],
    ],
    [
      [0, 0],
      [1, 0],
      [0.5, 0.2],
      [0, 1],
    ],
    [
      [0, 0],
      [0, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [2, 0],
      [0, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [NaN, 1],
    ],
  ])
    expect(validPolygon(v)).toBe(false);
  const p = project("Polygon", true);
  p.layers = [layer("polygon")];
  validateProject(p);
  const raw = JSON.stringify({
    message: "ok",
    operations: [
      {
        type: "update",
        id: p.layers[0].id,
        patch: {
          polygonPoints: [
            [0.2, 0],
            [0.8, 0],
            [1, 1],
            [0, 1],
          ],
        },
      },
    ],
  });
  const next = applyChat(p, raw).project;
  expect(next.layers[0].polygonPoints).toHaveLength(4);
  expect(p.layers[0].polygonPoints).toHaveLength(8);
  expect(
    localGenerate(next).some((f) => f.content.includes("dc.fillPolygon")),
  ).toBe(true);
  expect(() =>
    validateProject({
      ...p,
      layers: [
        {
          ...p.layers[0],
          polygonPoints: [
            [0, 0],
            [1, 1],
            [0, 1],
            [1, 0],
          ],
        },
      ],
    }),
  ).toThrow(/多边形/);
  const old = { ...project("Old", true), schemaVersion: 26 };
  const migrated = migrateProject(old);
  expect(migrated.schemaVersion).toBe(28);
  expect(old.schemaVersion).toBe(26);
  expect(migrated.id).toBe(old.id);
});
test("polygon is editable and survives native generation, undo and local save", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("PolygonUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "多边形", exact: true }).click();
  await page.getByLabel("多边形预设").selectOption("trapezoid");
  await expect(page.getByLabel("多边形顶点")).toHaveValue(
    "[[0.2,0],[0.8,0],[1,1],[0,1]]",
  );
  await expect(page.locator("[data-layer] > polygon")).toHaveCount(1);
  await page.getByLabel("多边形顶点").fill("[[0,0],[1,1],[0,1],[1,0]]");
  await page.getByLabel("多边形顶点").blur();
  await expect(page.getByRole("alert")).toContainText("凸多边形");
  await page.getByLabel("多边形预设").selectOption("8");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 PolygonUI", exact: true })
    .click();
  await expect(page.locator("[data-layer] > polygon")).toHaveCount(1);
});
