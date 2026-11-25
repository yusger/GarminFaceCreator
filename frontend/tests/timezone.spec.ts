import { test, expect } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { migrateProject } from "../src/migrations";
import { timeInOffset } from "../src/timeParts";
import { reading } from "../src/Scene";
import { generationLayer } from "../src/generationDto";
import { localGenerate } from "../src/localGenerator";
test("fixed UTC offsets handle date rollover, fractions and browser DST without claiming automatic DST", () => {
  expect(timeInOffset("23:50", 345, 0)).toBe("05:35");
  expect(timeInOffset("00:10", -720, 840)).toBe("22:10");
  expect(timeInOffset("23:50", 840, 0)).toBe("13:50");
  expect(timeInOffset("01:30", 0, -300)).toBe("06:30");
  expect(timeInOffset("03:30", 0, -240)).toBe("07:30");
  // Same UTC instant before/after a browser DST offset change -> same fixed destination.
  expect(timeInOffset("12:00", 330, -300)).toBe(
    timeInOffset("13:00", 330, -240),
  );
  expect(timeInOffset("", 0, 0)).toBe("--");
  const l = { ...layer("time"), timeUtcOffset: 345 };
  expect(
    reading(l, {
      time: "23:50",
      utcOffsetMinutes: 0,
      heartRate: 70,
      steps: 0,
      battery: 80,
      seconds: 0,
    }),
  ).toBe("05:35");
  expect(generationLayer(l)).toMatchObject({
    timeClock: "fixedUtcOffset",
    timeUtcOffset: 345,
    automaticDst: false,
  });
  expect(generationLayer(layer("time")).timeClock).toBe("deviceLocal");
});
test("native zones share a frame moment, preserve local clock and reject invalid offsets without source rewriting on migration", () => {
  const p = project("Zones", true);
  p.layers = [
    layer("time"),
    { ...layer("time"), timeUtcOffset: 345 },
    { ...layer("time"), timeUtcOffset: 345, timePart: "minuteOnes" },
    { ...layer("time"), timeUtcOffset: -720 },
  ];
  const source = localGenerate(p).find(
    (f) => f.path === "source/App.mc",
  )!.content;
  expect(source.match(/var zoneNow=Time.now/g)).toHaveLength(1);
  expect(source.match(/var zonep345=/g)).toHaveLength(1);
  expect(source).toContain("zoneNow.value()+20700");
  expect(source).toContain("zoneNow.value()+-43200");
  expect(source).toContain('clock.hour.format("%02d")');
  expect(source).toContain('(zonep345.min%10).format("%d")');
  expect(source).not.toContain("Timer");
  for (const bad of [-721, 841, 0.5, NaN]) {
    const q = { ...p, layers: [{ ...layer("time"), timeUtcOffset: bad }] };
    expect(() => validateProject(q)).toThrow(/UTC/);
    expect(() => localGenerate(q)).toThrow(/UTC/);
  }
  p.files = [{ path: "source/App.mc", content: "// original" }];
  const migrated = migrateProject({ ...p, schemaVersion: 16 });
  expect(migrated.schemaVersion).toBe(21);
  expect(migrated.files).toEqual(p.files);
  expect(migrated.layers[0].timeUtcOffset).toBeUndefined();
});
test("time basis and offset inspector preserve independent parts, invalidate code and survive reload", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("ZoneEdit"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByLabel("时间基准", { exact: true }).selectOption("fixed");
  await page.getByLabel("UTC 偏移分钟", { exact: true }).fill("345");
  await page.getByLabel("UTC 偏移分钟", { exact: true }).blur();
  await expect(page.getByText(/固定偏移不自动调整夏令时/)).toBeVisible();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByLabel("时间部分", { exact: true }).selectOption("hours");
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 ZoneEdit", exact: true })
    .click();
  await page.locator(".layer-row").first().click();
  await expect(page.getByLabel("UTC 偏移分钟", { exact: true })).toHaveValue(
    "345",
  );
  await page.getByLabel("时间基准", { exact: true }).selectOption("local");
  await expect(page.getByLabel("UTC 偏移分钟", { exact: true })).toHaveCount(0);
});
