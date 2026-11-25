import { test, expect } from "@playwright/test";
import { chalkPlans } from "../src/chalkFonts";
import { project, layer, validateProject } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
test("chalk font plans adapt physical pixels, preserve stable IDs and reject unsupported glyphs", () => {
  const p = project("Chalk", true);
  p.layers = [{ ...layer("time"), garminFont: "chalk", size: 62, aodSize: 54 }];
  expect(chalkPlans(p).map((f) => f.size)).toEqual([62, 54]);
  const large = localGenerate(p);
  expect(large.find((f) => f.path === "source/App.mc")!.content).toContain(
    "fontFor(Rez.Fonts.GfcChalkLatin62)",
  );
  p.target = "venu441mm";
  p.deviceSize = "41mm";
  expect(chalkPlans(p).map((f) => f.size)).toEqual([53, 46]);
  expect(chalkPlans(p)[0].id).toBe("GfcChalkLatin62");
  p.layers = [{ ...layer("text"), garminFont: "chalk", text: "中文" }];
  expect(() => localGenerate(p)).toThrow();
  p.layers[0].garminFont = "chalkHan";
  expect(() => localGenerate(p)).not.toThrow();
});
test("fixed heart-rate bindings survive validation and cannot switch to another source", () => {
  const p = project("Fixed", true);
  p.layers = [
    {
      ...layer("metric"),
      metricDecoration: false,
      source: "heartRate",
      sourceLocked: true,
    },
  ];
  expect(() => validateProject(p)).not.toThrow();
  p.layers[0].source = "steps";
  expect(() => validateProject(p)).toThrow(/固定心率/);
});
