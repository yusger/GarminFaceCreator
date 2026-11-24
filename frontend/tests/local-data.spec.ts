import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { formatMetricValue } from "../src/metricFormat";
import { generationRequirements } from "../src/generationRequirements";
test("basic data generator reads each live source once, converts only distance, and preserves missing policy", () => {
  const p = project("Data", true);
  p.layers = [
    layer("date"),
    ...["steps", "battery", "seconds", "calories", "distance"].map(
      (source) => ({ ...layer("metric"), source, aod: true }),
    ),
    layer("meter"),
  ];
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source.match(/ActivityMonitor.getInfo\(\)/g)).toHaveLength(1);
  expect(source.match(/System.getSystemStats\(\)/g)).toHaveLength(1);
  expect(source).toContain("info.distance/100000.0");
  expect(source).toContain("datacalories=info.calories");
  expect(source).not.toContain("UserProfile");
  expect(source).not.toContain("Timer");
  expect(source).toContain("Gregorian.info(Time.now(),Time.FORMAT_SHORT)");
  expect(source).toContain("calendar.day_of_week-1");
  expect(source).toContain("var value=0;");
  expect(source).toContain("return label+missing");
  expect(source).toContain("value<=100");
  expect(generationRequirements(p).permissions).toEqual([]);
  const seconds = {
    ...layer("metric"),
    source: "seconds",
    aod: true,
    aodSeconds: "hide" as const,
  };
  p.layers = [seconds];
  const hidden = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(hidden).toContain("if(sleeping){}else{");
  p.layers = [{ ...seconds, label: "私有" }];
  expect(() => localGenerate(p)).toThrow(/字形|ASCII/);
  p.layers = [{ ...seconds, source: "heartRate" }];
  expect(() => localGenerate(p)).toThrow(/仅支持/);
});
test("shared automatic number format retains six decimals, grouping and explicit precision", () => {
  expect(formatMetricValue("steps", 4500)).toBe("4,500");
  expect(formatMetricValue("seconds", 7)).toBe("07");
  expect(formatMetricValue("battery", 78)).toBe("78");
  expect(formatMetricValue("distance", 6.42)).toBe("6.42");
  expect(formatMetricValue("distance", 6.40000001)).toBe("6.4");
  expect(formatMetricValue("distance", 6.4, 2)).toBe("6.40");
});
