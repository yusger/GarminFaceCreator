import { test, expect } from "@playwright/test";
import { project, layer, metrics } from "../src/domain";
import { reading } from "../src/Scene";
import { generationRequirements } from "../src/generationRequirements";
import { metricDisplayUnits } from "../src/metricFormat";
const preview = {
  time: "09:41",
  heartRate: 72,
  steps: 4500,
  battery: 78,
  seconds: 12,
};
test("all metric generation suffixes agree with web format without conflating physical units", () => {
  for (const source of Object.keys(metrics)) {
    const p = project("Clock", true);
    p.layers = [{ ...layer("metric"), source }];
    const data = generationRequirements(p).dataSources[0];
    expect(data.defaultDisplayUnit).toBe(metricDisplayUnits[source] || "");
    if (data.defaultDisplayUnit)
      expect(
        reading(p.layers[0], preview).endsWith(data.defaultDisplayUnit),
      ).toBe(true);
  }
  expect(reading({ ...layer("metric"), source: "altitude" }, preview)).toBe(
    "-59ft",
  );
  expect(reading({ ...layer("metric"), source: "windSpeed" }, preview)).toBe(
    "6m/s",
  );
  expect(
    reading({ ...layer("metric"), source: "windSpeed", unit: "" }, preview),
  ).toBe("6");
  const p = project("Clock", true);
  p.layers = [{ ...layer("metric"), source: "altitude" }];
  expect(generationRequirements(p).dataSources[0].read).toContain(
    "* 3.280839895",
  );
  p.layers[0].source = "heartRate";
  expect(generationRequirements(p).glyphs).toContain("♡");
});
