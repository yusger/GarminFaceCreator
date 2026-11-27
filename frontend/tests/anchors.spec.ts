import { test, expect } from "@playwright/test";
import { layer, project } from "../src/domain";
import { anchorPosition, coordinatePatch } from "../src/anchors";
import { renderChanged } from "../src/groups";
import { binaryAssets } from "../src/assets";
import { generate } from "../src/api";
test("anchor readouts account for rotation while storage remains top-left", () => {
  const l = {
    ...layer("rect"),
    x: 100,
    y: 100,
    w: 100,
    h: 50,
    rotation: 90,
    anchor: "topLeft" as const,
  };
  expect(anchorPosition(l).x).toBeCloseTo(175);
  expect(anchorPosition(l).y).toBeCloseTo(75);
  expect(coordinatePatch(l, "x", 200).x).toBeCloseTo(125);
  expect(anchorPosition({ ...l, anchor: "center" })).toEqual({
    x: 150,
    y: 125,
  });
  expect(renderChanged([l], [{ ...l, anchor: "center", hidden: true }])).toBe(
    false,
  );
  expect(
    renderChanged(
      [l],
      [l, { ...layer("line"), guide: true, exportIncluded: false }],
    ),
  ).toBe(false);
});
test("generation excludes guide/image resources while hidden exportable layers remain", async () => {
  const p = project();
  const excluded = {
    ...layer("image"),
    assetId: "private",
    image: "data:image/png;base64,PRIVATE",
    exportIncluded: false,
  };
  p.layers = [
    { ...layer("text"), hidden: true, exportIncluded: true, anchor: "center" },
    excluded,
    { ...layer("line"), guide: true, exportIncluded: false },
  ];
  p.assets = [{ path: "assets/private.png", data: excluded.image }];
  expect(binaryAssets(p)).toHaveLength(0);
  const original = globalThis.fetch;
  let scene: any;
  globalThis.fetch = async (_url, options) => {
    scene = JSON.parse(
      JSON.parse(String(options?.body)).messages[1].content,
    ).design;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                files: [
                  { path: "manifest.xml", content: '<application entry="GeneratedApp"/>' },
                  {
                    path: "monkey.jungle",
                    content: "project.manifest=manifest.xml",
                  },
                  { path: "source/App.mc", content: "// fixture" },
                ],
              }),
            },
          },
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );
  };
  try {
    await generate(
      {
        id: "test",
        name: "test",
        url: "https://api.example.com/v1",
        model: "test",
        key: "",
        remember: false,
        temperature: 0.2,
        tokens: 2048,
      },
      p,
      "test",
      new AbortController().signal,
    );
  } finally {
    globalThis.fetch = original;
  }
  expect(scene.layers).toHaveLength(1);
  expect(scene.layers[0].hidden).toBe(false);
  expect(scene.layers[0].anchor).toBeUndefined();
  expect(scene.assets).toEqual([]);
});
test("anchor inputs preserve layout and guides stay out of independent preview", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const clock = await page
    .locator("svg.watch g[data-layer]")
    .filter({ hasText: "09:41" })
    .getAttribute("data-layer");
  await page.getByRole("button", { name: "添加辅助线", exact: true }).click();
  await expect(page.locator("svg.watch [data-guide=true]")).toHaveCount(1);
  await expect(page.locator(".drawer-caption")).toContainText("与设计一致");
  await page.getByLabel("坐标锚点", { exact: true }).selectOption("center");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("215");
  await expect(page.getByLabel("Y", { exact: true })).toHaveValue("205");
  await page.getByLabel("X", { exact: true }).fill("240");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("240");
  await page.getByLabel("坐标锚点", { exact: true }).selectOption("topLeft");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("165");
  await expect(page.locator(".drawer-caption")).toContainText("与设计一致");
  await page.getByRole("button", { name: "隐藏 时间", exact: true }).click();
  await expect(page.locator(`svg.watch [data-layer="${clock}"]`)).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".preview-studio [data-guide=true]")).toHaveCount(
    0,
  );
  await expect(
    page.locator(`.preview-studio [data-layer="${clock}"]`),
  ).toHaveCount(2);
});
