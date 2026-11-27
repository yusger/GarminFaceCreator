import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { sourceMapFor } from "../src/sourceMap";
import { validateControls } from "../src/projectControls";
test("large draw plans use bounded frame methods and maintain original layer mapping order", () => {
  const p = project("Large", true);
  p.layers = Array.from({ length: 80 }, (_, i) => ({
    ...layer("circle"),
    id: "circle-" + i,
    x: 100,
    y: 100,
    w: 10,
    h: 10,
    aod: true,
  }));
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source).toContain("function render_active_19");
  expect(source).toContain("frameContext=null;");
  const map = sourceMapFor([{ path: "source/App.mc", content: source }]);
  expect(map).toHaveLength(160);
  expect(map.filter((r) => r.mode === "active").map((r) => r.layerId)).toEqual(
    p.layers.map((l) => l.id),
  );
  expect(source.slice(source.indexOf("function onUpdate"))).not.toContain(
    "dc.fillPolygon",
  );
});
test("settings snapshots retain typed values and duplicate source variants cannot inflate a method", () => {
  const p = project("Settings", true),
    l = { ...layer("metric"), source: "steps", metricDecoration: false };
  p.layers = [l];
  p.controls = [
    {
      id: "source",
      label: "Source",
      type: "dataSource",
      default: "steps",
      options: ["steps", "battery"],
      targets: [{ layerId: l.id, property: "source" }],
    },
  ];
  const s = localGenerate(p).find((f) => f.path === "source/App.mc")!.content;
  expect(s).toContain("frameContext[:cfg_source] as Toybox.Lang.String");
  expect(s).toContain(":databattery=>databattery");
  p.controls[0].options = ["steps", "steps"];
  expect(() => validateControls(p)).toThrow(/唯一/);
});
