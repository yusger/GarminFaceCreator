import { generate } from "../src/api";
import { repairPayload } from "../src/repair";
import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { project, layer } from "../src/domain";
import {
  weatherGroups,
  weatherGroup,
  weatherIconId,
  nativeIconFiles,
  iconVariants,
} from "../src/weatherIcons";
import { localGenerate } from "../src/localGenerator";
import { generationRequirements } from "../src/generationRequirements";
const weatherLayer = () => ({
  ...layer("image"),
  libraryIcon: {
    id: "meteocons_0_1_0_monochrome_clear_day",
    recolor: false,
    strokeWidth: 2,
  },
  weatherIcon: { period: "night" as const },
});
test("every documented condition maps once and unknown weather never pretends to be clear", () => {
  const all = weatherGroups.flatMap((g) => g.values).sort((a, b) => a - b);
  expect(all).toEqual(Array.from({ length: 54 }, (_, i) => i));
  for (const v of [null, undefined, NaN, -1, 999, 53])
    expect(weatherGroup(v).key).toBe("missing");
  expect(weatherIconId(weatherLayer(), "clear")).toContain("clear_night");
  expect(iconVariants(weatherLayer())).toHaveLength(9);
  const p = project("Weather", true);
  p.layers = [weatherLayer()];
  expect(generationRequirements(p).permissions).toEqual([]);
  expect(
    localGenerate(p).find((f) => f.path==="source/GfcWeather.mc")!.content,
  ).toContain("Weather.getCurrentConditions()");
  expect(
    localGenerate(p).find((f) => f.path === "source/App.mc")!.content,
  ).toContain("GfcIcons.draw_");
});
function unzip(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      n = bytes.readUInt16LE(offset + 26),
      e = bytes.readUInt16LE(offset + 28),
      start = offset + 30 + n + e;
    files.set(
      bytes.subarray(offset + 30, offset + 30 + n).toString(),
      bytes.subarray(start, start + size),
    );
    offset = start + size;
  }
  return files;
}
for (const device of [
  { size: "45mm", pixels: 454, target: "venu445mm" },
  { size: "41mm", pixels: 390, target: "venu441mm" },
  {
    series: "fēnix",
    model: "fēnix 8 AMOLED",
    size: "43mm",
    pixels: 416,
    target: "fenix843mm",
  },
])
  test(
    "cached-weather icon binding preview export and native compile " +
      device.target,
    async ({ page, request }) => {
      test.setTimeout(150000);
      await page.goto("/");
      page.on("dialog", (d) => d.accept("Weather Clock"));
      await page
        .getByRole("button", { name: "空白画布", exact: false })
        .click();
      if (device.series) {
        await page
          .getByLabel("手表系列", { exact: true })
          .selectOption(device.series);
        await page
          .getByLabel("手表型号", { exact: true })
          .selectOption(device.model!);
      }
      await page
        .getByLabel("手表尺寸", { exact: true })
        .selectOption(device.size);
      await page.getByRole("button", { name: "创建项目", exact: true }).click();
      await page.getByRole("button", { name: "素材", exact: true }).click();
      await page.getByLabel("素材分类").selectOption("meteocons");
      await page
        .getByRole("button", {
          name: "插入素材 晴天 · monochrome",
          exact: true,
        })
        .click();
      await page.getByLabel("绑定实时天气").check();
      await page.getByLabel("天气昼夜样式").selectOption("night");
      await expect
        .poll(async () =>
          decodeURIComponent(
            (await page.locator("svg.watch image").getAttribute("href")) || "",
          ),
        )
        .toContain("clear-night");
      await page.getByRole("button", { name: "预览", exact: true }).click();
      await page.getByLabel("模拟天气").selectOption("3");
      await expect
        .poll(async () =>
          decodeURIComponent(
            (await page
              .locator(".preview-studio svg image")
              .first()
              .getAttribute("href")) || "",
          ),
        )
        .toContain('id="rain"');
      await page.getByLabel("模拟天气").selectOption("53");
      await expect
        .poll(async () =>
          decodeURIComponent(
            (await page
              .locator(".preview-studio svg image")
              .first()
              .getAttribute("href")) || "",
          ),
        )
        .toContain("not-available");
      await page.getByRole("button", { name: "关闭预览", exact: true }).click();
      await page
        .getByRole("button", { name: "本地生成（试验）", exact: true })
        .click();
      await page
        .getByRole("button", { name: "应用生成结果", exact: true })
        .click();
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
        .click();
      const files = unzip(await readFile((await (await pending).path())!));
      const meta = JSON.parse(files.get("gfc-export.json")!.toString());
      expect(meta.usedIcons).toHaveLength(9);
      expect(meta.iconUsages[0].weather.period).toBe("night");
      expect(meta.iconUsages[0].resources).toHaveLength(9);
      expect(files.has("licenses/Meteocons-LICENSE.txt")).toBe(true);
      const pngs = [...files].filter(
        ([path]) => path.startsWith("assets/") && path.endsWith(".png"),
      );
      expect(pngs).toHaveLength(9);
      for (const [, data] of pngs)
        expect(data.readUInt32BE(16)).toBe(
          Math.ceil((64 * device.pixels) / 454),
        );
      const form = new FormData();
      form.append(
        "project",
        JSON.stringify({
          projectId: meta.projectId,
          appId: meta.appId,
          target: meta.target,
          revision: meta.codeRevision,
          projectName: "WeatherIcons",
        }),
      );
      for (const [path, data] of files)
        if (
          /^(manifest.xml|monkey.jungle|source\/|resources\/|assets\/)/.test(
            path,
          )
        )
          form.append("files", new Blob([data]), path);
      const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
        method: "POST",
        body: form,
      });
      expect(r.status,await r.clone().text()).toBe(202);
      const job = await r.json(),headers={Authorization:"Bearer "+job.accessToken};
      await expect
        .poll(
          async () =>
            (await (await request.get("/api/builds/" + job.buildId,{headers})).json())
              .status,
          { timeout: 110000, intervals: [1000] },
        )
        .toBe("succeeded");
      const state = await (
        await request.get("/api/builds/" + job.buildId,{headers})
      ).json();
      if (process.env.GFC_TEST_ARTIFACT_DIR) {
        await mkdir(process.env.GFC_TEST_ARTIFACT_DIR, { recursive: true });
        await writeFile(
          join(
            process.env.GFC_TEST_ARTIFACT_DIR,
            device.target + "_WeatherIcons.prg",
          ),
          await (await request.get(state.artifacts[0].url,{headers})).body(),
        );
      }
    },
  );

test("AI output cannot override fixed icon helper and weather pixels stay out of prompt", async () => {
  const p = project("Weather", true);
  p.layers = [
    {
      ...weatherLayer(),
      image: "data:image/png;base64,PRIVATE_WEATHER_PIXELS",
    },
  ];
  const profile = {
    id: "mock",
    name: "mock",
    url: "https://api.example.com/v1",
    model: "mock",
    key: "mock-private-key",
    remember: false,
    tokens: 2048,
    temperature: 0.2,
  };
  const returned = localGenerate(p).map((f) =>
    f.path === "source/GfcIcons.mc"
      ? { ...f, content: "// malicious replacement" }
      : f,
  );
  const old = globalThis.fetch;
  let payload: any;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        choices: [
          { message: { content: JSON.stringify({ files: returned }) } },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    const files = await generate(
      profile,
      p,
      "test",
      new AbortController().signal,
    );
    expect(files.find((f) => f.path === "source/GfcIcons.mc")).toEqual(
      nativeIconFiles(p).find((f) => f.path === "source/GfcIcons.mc"),
    );
    const design = JSON.parse(payload.messages[1].content).design;
    expect(design.assets).toHaveLength(9);
    expect(design.nativeIconBindings).toHaveLength(1);
    expect(
      design.nativeIconHelpers.every((f: any) => f.managed && !f.content),
    ).toBe(true);
    expect(design.layers[0].asset).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("PRIVATE_WEATHER_PIXELS");
    expect(JSON.stringify(payload)).not.toContain(profile.key);
    p.files = files;
    expect(() => repairPayload(p, ["source/GfcIcons.mc"], "", profile)).toThrow(
      /固定/,
    );
  } finally {
    globalThis.fetch = old;
  }
});
