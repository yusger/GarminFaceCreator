import { test, expect } from "@playwright/test";
import { layer, project } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { combineLayers } from "../src/widgets";
import { mappedDraw, sourceMapFor, mappedDiagnostic } from "../src/sourceMap";
test("source ranges cover exact emitted lines and locate private children through the parent", () => {
  const p = project("Mapping", true);
  p.layers = [
    { ...layer("rect"), x: 100, y: 100, w: 100, h: 100, aod: true },
    { ...layer("time"), x: 110, y: 120, w: 100, h: 40, aod: true },
  ];
  const q = combineLayers(
      p,
      p.layers.map((l) => l.id),
    ),
    files = localGenerate(q),
    map = sourceMapFor(files);
  expect(map).toHaveLength(4);
  expect(new Set(map.map((r) => r.layerId))).toEqual(new Set([q.layers[0].id]));
  for (const r of map) {
    expect(mappedDiagnostic(map, { path: r.path, line: r.start })).toBe(r);
    expect(
      files.find((f) => f.path === r.path)!.content.split("\n")[r.start - 1],
    ).toMatch(/^if\(/);
    expect(
      mappedDiagnostic(map, { path: r.path, line: r.end + 1 }),
    ).toBeUndefined();
  }
  expect(
    mappedDiagnostic(map, { path: "source/Other.mc", line: 3 }),
  ).toBeUndefined();
  const malicious = {
    layerId: "name\n*/more",
    partId: "id",
    capabilityId: "core.text",
    mode: "active" as const,
  };
  const code = mappedDraw("dc.clear();", malicious);
  expect(code).not.toContain("name\n");
  expect(
    sourceMapFor([
      {
        path: "source/App.mc",
        content: "// GarminFaceCreator local generator fixture\n" + code,
      },
    ])[0].layerId,
  ).toBe(malicious.layerId);
  expect(
    sourceMapFor([
      {
        path: "source/App.mc",
        content:
          "// GarminFaceCreator local generator fixture\n// GFC_LAYER_BEGIN malformed\n",
      },
    ]),
  ).toEqual([]);
});
test("compiler diagnostics locate a generated control while retaining raw error lines", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("MapUI"));
  let line = 0;
  await page.route("**/api/capabilities", (r) =>
    r.fulfill({
      json: { devices: [{ target: "venu445mm", ready: true, reasons: [] }] },
    }),
  );
  await page.route("**/api/builds", async (r) => {
    const body = r.request().postDataBuffer()!.toString("utf8");
    const source = body.slice(
      body.indexOf("// GarminFaceCreator local generator"),
    );
    line =
      source.split("\n").findIndex((s) => s.startsWith("// GFC_LAYER_BEGIN ")) +
      2;
    return r.fulfill({ status: 202, json: { buildId: "mapped" } });
  });
  await page.route("**/api/builds/mapped", (r) =>
    r.fulfill({ json: { status: "failed", artifacts: [] } }),
  );
  await page.route("**/api/builds/mapped/logs?*", (r) =>
    r.fulfill({
      json: {
        lines: [
          `ERROR: venu445mm: /project/source/App.mc:${line},1: mapping fixture`,
        ],
        nextCursor: 1,
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "矩形", exact: true }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "mapping fixture",
  );
  await page
    .getByRole("button", { name: "定位控件 矩形", exact: true })
    .click();
  await expect(page.getByLabel("图层名称", { exact: true })).toHaveValue(
    "矩形",
  );
});
