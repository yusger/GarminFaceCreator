import {binaryAssets} from "../src/assets";
import {chalkPlans} from "../src/chalkFonts";
import {widgetNotices} from "../src/widgets";
import { test, expect } from "@playwright/test";
import { layer, project, validateProject } from "../src/domain";
import {
  combineLayers,
  cloneCompound,
  decomposeWidget,
  insertWidget,
} from "../src/widgets";
import { expandedChildren } from "../src/compound";
import { localGenerate } from "../src/localGenerator";
import { applyChat } from "../src/designChat";
function fixture() {
  const p = project("CompoundGeometry", true);
  p.layers = [
    {
      ...layer("polygon"),
      x: 90,
      y: 90,
      w: 274,
      h: 274,
      aod: true,
      rotation: 30,
    },
    {
      ...layer("ring"),
      x: 100,
      y: 100,
      w: 254,
      h: 254,
      ringStyle: "continuous",
      ringWidth: 12,
      aod: true,
    },
    {
      ...layer("arcText"),
      x: 100,
      y: 100,
      w: 254,
      h: 254,
      text: "GEAR",
      size: 14,
      arcSpacing: 2,
      aod: true,
    },
    { ...layer("time"), x: 120, y: 190, w: 214, h: 80, aod: true },
  ];
  return p;
}
const drawing=(s:string)=>s.replace(/^\/\/ GFC_LAYER_(?:BEGIN.*|END)\r?$/gm, "");
test("compound v2 retains geometry, a single parent, native semantics and independent copies", () => {
  const p = fixture(),
    before = JSON.stringify(p),
    q = combineLayers(
      p,
      p.layers.map((l) => l.id),
    ),
    root = q.layers[0];
  expect(root.compound!.version).toBe(2);
  expect(q.layers).toHaveLength(1);
  validateProject(q);
  expect(
    drawing(localGenerate(q).find((f) => f.path === "source/App.mc")!.content),
  ).toBe(drawing(localGenerate(p).find((f) => f.path === "source/App.mc")!.content));
  const original = expandedChildren(root, q),
    scaled = expandedChildren(
      { ...root, w: root.w * 0.75, h: root.h * 0.75 },
      q,
    );
  expect(scaled.find((l) => l.kind === "ring")!.ringWidth).toBe(9);
  expect(scaled.find((l) => l.kind === "arcText")!.arcSpacing).toBe(1.5);
  expect(scaled.find((l) => l.kind === "polygon")!.polygonPoints).toEqual(
    original.find((l) => l.kind === "polygon")!.polygonPoints,
  );
  const copy = cloneCompound(root);
  expect(
    copy.compound!.layers.some((l) =>
      root.compound!.layers.some((c) => c.id === l.id),
    ),
  ).toBe(false);
  copy.compound!.parts[0].enabled = false;
  expect(root.compound!.parts[0].enabled).toBe(true);
  const flat = decomposeWidget(q, root.id);
  validateProject(flat);
  expect(flat.layers.map((l) => l.kind)).toEqual(p.layers.map((l) => l.kind));
  expect(JSON.stringify(p)).toBe(before);
  const old = {
    ...q,
    layers: [{ ...root, compound: { ...root.compound!, version: 1 as const } }],
  };
  expect(() => validateProject(old)).toThrow(/内部类型/);
  expect(() =>
    applyChat(
      q,
      JSON.stringify({
        message: "bad",
        operations: [
          { type: "update", id: root.id, patch: { compound: root.compound } },
        ],
      }),
    ),
  ).toThrow();
  const v1 = insertWidget(project("Legacy", true), "capsule-metric");
  expect(
    validateProject({ ...v1, schemaVersion: 29 }).layers[0].compound!.version,
  ).toBe(1);
});
test("combining rejects interleaved layers, crossing data links and nested private objects", () => {
  const p = fixture();
  expect(() => combineLayers(p, [p.layers[0].id, p.layers[2].id])).toThrow(
    /相邻/,
  );
  p.layers[0].sourceLabelFor = p.layers[2].id;
  expect(() =>
    combineLayers(
      p,
      p.layers.slice(0, 2).map((l) => l.id),
    ),
  ).toThrow(/联动标签/);
  delete p.layers[0].sourceLabelFor;
  const q = combineLayers(
    p,
    p.layers.slice(0, 2).map((l) => l.id),
  );
  expect(() =>
    combineLayers(
      q,
      q.layers.map((l) => l.id),
    ),
  ).toThrow(/嵌套/);
});
test("editor combines and scales new geometry as one object with undo and persistence", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("CompoundUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "多边形", exact: true }).click();
  await page.getByRole("button", { name: "曲线文字", exact: true }).click();
  await page.locator(".layer-row").first().click();
  await page.locator(".layer-row").nth(1).click({modifiers:["Shift"]});
  await page.getByRole("button", { name: "合为复合控件", exact: true }).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.getByLabel("复合控件名称")).toBeVisible();
  await page.getByTitle("撤销",{exact:true}).click();
  await expect(page.locator(".layer-row")).toHaveCount(2);
  await page.getByTitle("重做",{exact:true}).click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await page.locator(".layer-row").first().click();
  await page.getByLabel("复合控件w").fill("300");
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(2);
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^我的表盘/ }).click();
  await page
    .getByRole("button", { name: "打开 CompoundUI", exact: true })
    .click();
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await expect(page.locator("svg.watch [data-widget-part]")).toHaveCount(2);
});
for (const [target, size] of [
  ["venu445mm", "45mm"],
  ["venu441mm", "41mm"],
])
  test(`compound geometry SDK ${target}`, async ({ request }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit SDK staging test");
    test.setTimeout(130000);
    const p = fixture();
    p.target = target;
    p.deviceSize = size;
    const q = combineLayers(
        p,
        p.layers.map((l) => l.id),
      ),
      form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: q.id,
        appId: q.appId,
        target,
        revision: q.revision,
        projectName: q.name,
      }),
    );
    for (const f of localGenerate(q))
      form.append("files", new Blob([f.content]), f.path);
    const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(r.status).toBe(202);
    const job = await r.json();
    const headers = job.accessToken
      ? { Authorization: "Bearer " + job.accessToken }
      : {};
    await expect
      .poll(
        async () => {
          const state = await (
            await request.get(`/api/builds/${job.buildId}`, { headers })
          ).json();
          if (state.status === "failed")
            throw Error("Compound SDK compilation failed");
          return state.status;
        },
        { timeout: 110000, intervals: [1000] },
      )
      .toBe("succeeded");
  });

test("nested image, font and attribution survive generation and source export preparation",()=>{
 const p=project("Resources",true);p.layers=[{...layer("image"),x:10,y:10,w:100,h:100,image:"data:image/png;base64,fixture",widgetOrigin:{id:"example",version:"1.0.0",license:"MIT",notice:"Author"}},{...layer("text"),x:10,y:110,w:100,h:40,garminFont:"chalk",text:"TEST"}];
 const q=combineLayers(p,p.layers.map(l=>l.id));expect(binaryAssets(q)).toHaveLength(1);expect(chalkPlans(q)).toHaveLength(1);expect(widgetNotices(q)[0].license).toBe("MIT");expect(expandedChildren(q.layers[0],q)[0].widgetOrigin!.notice).toBe("Author");
});
