import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import {
  generationRequirements as requirements,
  generationManifest,
} from "../src/generationRequirements";
test("permissions and API follow included metric and ring sources", () => {
  const p = project("ASCII");
  p.layers = [layer("time")];
  expect(requirements(p)).toMatchObject({
    permissions: [],
    minApiLevel: "4.2.1",
    languages: ["eng"],
  });
  p.layers.push({ ...layer("metric"), source: "uvIndex" });
  expect(requirements(p)).toMatchObject({
    permissions: [],
    minApiLevel: "5.1.0",
  });
  p.layers.push(
    { ...layer("ring"), ringSource: "heartRate" },
    { ...layer("metric"), source: "stress" },
    { ...layer("metric"), source: "recoveryHours" },
    { ...layer("metric"), source: "unknown", exportIncluded: false },
  );
  expect(requirements(p).permissions).toEqual([
    "ComplicationSubscriber",
    "SensorHistory",
  ]);
  expect(generationManifest(p)).toContain('minApiLevel="5.1.0"');
  expect(
    requirements(p).dataSources.find((d) => d.source === "recoveryHours")?.read,
  ).toContain("/ 60.0");
});
test("native resource text drives glyphs and locales independently of editor labels", () => {
  const p = project("ASCII");
  p.layers = [
    {
      ...layer("text"),
      text: "HELLO",
      name: "中文图层",
      groupName: "中文分组",
    },
    { ...layer("text"), text: "排除", exportIncluded: false },
  ];
  expect(requirements(p).languages).toEqual(["eng"]);
  p.layers[0].text = "心率";
  expect(requirements(p).languages).toEqual(["eng", "zhs", "zht"]);
  expect(requirements(p).glyphs).toContain("心");
  p.layers[0].text = "かな";
  expect(requirements(p).languages).toEqual(["eng", "jpn"]);
  p.name = "中文项目";
  expect(requirements(p).languages).toEqual(["eng", "zhs", "zht", "jpn"]);
  p.layers.push({ ...layer("metric"), source: "temperature" });
  expect(requirements(p).glyphs).toContain("°");
});
test("unknown included sources cannot silently create invented API calls", () => {
  const p = project();
  p.layers = [{ ...layer("metric"), source: "invented" }];
  expect(() => requirements(p)).toThrow(/尚无已核查/);
});
