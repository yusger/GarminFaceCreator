import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import {
  libraryIconMaskLayers,
  useLibraryIconMask,
} from "../src/libraryIconMasks";
import { nativeIconFiles, nativeIconBindings } from "../src/weatherIcons";
import { localGenerate } from "../src/localGenerator";
import { setControl } from "../src/projectControls";
function fixture() {
  const p = project("LibraryMasks", true);
  p.layers = [
    {
      ...layer("image"),
      id: "heart",
      name: "Heart",
      x: 100,
      y: 100,
      w: 28,
      h: 28,
      color: "#38E1D0",
      aod: true,
      aodColor: "#667788",
      libraryIcon: {
        id: "lucide_586bf5cf_heart_pulse",
        recolor: true,
        strokeWidth: 2,
      },
    },
  ];
  p.controls = [
    {
      id: "ink",
      label: "Ink",
      type: "color",
      default: "#38E1D0",
      targets: [{ layerId: "heart", property: "color" }],
    },
  ];
  return p;
}
test("small recolorable library icons use runtime ink and independent AOD ink while preserving legacy draw calls", () => {
  const p = fixture(),
    files = localGenerate(setControl(p, "ink", "#FF77BB")),
    code = files.find((f) => f.path === "source/App.mc")!.content,
    helper = files.find((f) => f.path === "source/GfcIcons.mc")!.content;
  expect(code).toContain("draw_heartTint");
  expect(code).toMatch(/draw_heartTint\([^;]+cfg_ink/);
  expect(code).toMatch(/draw_heartTint\([^;]+0x667788/);
  expect(helper).toContain("static function draw_heart(");
  expect(helper).toContain("static function draw_heartTint(");
  expect(helper).toContain("dc.drawText(x,y-1");
  expect(
    files.find((f) => f.path === "resources/fonts/gfc-library-icons.xml")!
      .content,
  ).toContain("GfcLibrary_heart");
  expect(nativeIconBindings(p)[0].call).toContain("activeOrAodInk");
  expect(nativeIconBindings(p)[0].assets).toEqual([]);
});
test("unmeasured targets, full-colour icons and larger sizes keep their existing bitmap path", () => {
  const p = fixture();
  p.target = "fenix843mm";
  p.deviceSize = "43mm";
  expect(useLibraryIconMask(p, p.layers[0])).toBe(false);
  expect(
    localGenerate(p).find((f) => f.path === "source/App.mc")!.content,
  ).not.toContain("draw_heartTint");
  p.target = "venu445mm";
  p.deviceSize = "45mm";
  for (const patch of [
    { w: 130 },
    { h: 1 },
    { libraryIcon: { ...p.layers[0].libraryIcon!, recolor: false } },
  ])
    expect(useLibraryIconMask(p, { ...p.layers[0], ...patch })).toBe(false);
});
test("grayscale glyph budgets and sanitized identity collisions fail before preparing assets", () => {
  const p = fixture();
  p.layers = Array.from({ length: 9 }, (_, i) => ({
    ...p.layers[0],
    id: "icon" + i,
    w: 128,
    h: 128,
  }));
  expect(() => libraryIconMaskLayers(p)).toThrow(/128Ki/);
  p.layers = [
    { ...p.layers[0], id: "icon-a", w: 28, h: 28 },
    { ...p.layers[0], id: "icon_a", w: 28, h: 28 },
  ];
  expect(() => libraryIconMaskLayers(p)).toThrow(/identity/);
});
test("monochrome weather masks keep the category and missing glyph mapping", () => {
  const p = fixture();
  p.layers[0].libraryIcon!.id = "meteocons_0_1_0_monochrome_clear_day";
  p.layers[0].weatherIcon = { period: "day" };
  const helper = nativeIconFiles(p).find(
    (f) => f.path === "source/GfcIcons.mc",
  )!.content;
  expect(helper).toContain("cachedCondition");
  expect(helper).toContain('var glyph="I"');
  expect(helper).toContain('glyph="A"');
  expect(helper).toContain("GfcWeather.read(low)");
});
