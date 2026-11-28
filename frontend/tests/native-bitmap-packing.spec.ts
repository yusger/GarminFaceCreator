import { test, expect } from "@playwright/test";
import { project } from "../src/domain";
import { preparedTransformBitmaps } from "../src/nativeBitmapPacking";
const files = [
  {
    path: "source/View.mc",
    content: "function draw(dc){dc.drawBitmap2(0,0,image,{});}",
  },
  {
    path: "resources/drawables/a.xml",
    content:
      '<resources><bitmap id="A" filename="a.png" automaticPalette="true"/><bitmap id="B" filename="b.svg"></bitmap><string id="custom">Keep</string></resources>',
  },
];
test("AI transform preparation supplies non-indexed bitmaps without changing source or identities", () => {
  for (const target of ["venu445mm", "venu441mm"]) {
    const p = project("Packing", true);
    p.target = target;
    p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
    p.codeProvenance = { primary: "ai" };
    p.files = files;
    const r = preparedTransformBitmaps(p, files);
    expect(r[0]).toEqual(files[0]);
    expect(r[1].content.match(/automaticPalette="false"/g)).toHaveLength(2);
    expect(r[1].content).toContain('id="A" filename="a.png"');
    expect(r[1].content).toContain('packingFormat="png"');
    expect(r[1].content).toContain('dithering="none"');
    expect(r[1].content.match(/packingFormat=/g)).toHaveLength(1);
    expect(r[1].content).toContain("Keep");
    expect(preparedTransformBitmaps(p, r)).toEqual(r);
  }
});
test("explicit user palettes are rejected and deterministic/unused projects are unchanged", () => {
  const p = project("Packing", true);
  p.codeProvenance = { primary: "deterministic" };
  p.files = files;
  expect(preparedTransformBitmaps(p, files)).toBe(files);
  p.codeProvenance = { primary: "ai" };
  p.files = [
    {
      path: "source/View.mc",
      content: '// dc.drawBitmap2()\nvar s="dc.drawBitmap2()";',
    },
  ];
  expect(preparedTransformBitmaps(p, files)).toBe(files);
  p.files = files;
  expect(() =>
    preparedTransformBitmaps(p, [
      files[0],
      {
        path: files[1].path,
        content:
          '<resources><bitmap id="A" filename="a.png"><palette><color>FFFFFF</color></palette></bitmap></resources>',
      },
    ]),
  ).toThrow("显式调色板");
});
