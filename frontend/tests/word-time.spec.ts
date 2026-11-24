import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { project, layer, validateProject } from "../src/domain";
import {
  wordTimeLines,
  wordLocales,
  nativeWordTimeFiles,
} from "../src/wordTime";
import { localGenerate } from "../src/localGenerator";
import { generationRequirements } from "../src/generationRequirements";
import { generate } from "../src/api";
import { repairPayload } from "../src/repair";
const profile = {
  id: "test",
  name: "test",
  url: "https://api.example.com/v1",
  model: "mock",
  key: "mock-key-sentinel",
  remember: false,
  tokens: 2048,
  temperature: 0.2,
};
test("pinned MIT phrase tables retain upstream English/Chinese text and fuzzy boundaries", async () => {
  for (const [lang, file] of [
    ["en", "English"],
    ["zh", "Chinese"],
  ] as const) {
    const raw = await readFile(
      `frontend/public/reference-notices/AboutTime-${file}-strings.xml`,
      "utf8",
    );
    const values = Object.fromEntries(
      [...raw.matchAll(/<string id="([^"]+)">([^<]*)<\/string>/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
    for (let minute = 0; minute < 60; minute += 5) {
      const parts = values["min" + minute].split("\t");
      expect(wordLocales[lang].minutes[minute / 5]).toEqual(
        parts.length === 3
          ? parts
          : parts.length === 2
            ? ["", ...parts]
            : ["", parts[0], ""],
      );
    }
  }
  expect(wordTimeLines(11, 15, 0)).toEqual(["quarter", "past", "eleven"]);
  expect(wordTimeLines(11, 15, 0, "zh")).toEqual(["十一点", "过了", "十五分"]);
  expect(wordTimeLines(9, 2, 29)).toEqual(["", "nine", "o'clock"]);
  expect(wordTimeLines(9, 2, 30)).toEqual(["little", "past", "nine"]);
  expect(wordTimeLines(9, 30, 0)).toEqual(["half", "past", "nine"]);
  expect(wordTimeLines(23, 59, 59)).toEqual(["", "twelve", "o'clock"]);
  expect(wordTimeLines(23, 59, 59, "zh")).toEqual(["", "午夜", ""]);
  expect(wordTimeLines(11, 59, 59, "zh")).toEqual(["", "中午", ""]);
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m++)
      for (const lang of ["en", "zh"] as const)
        expect(
          wordTimeLines(h, m, 59, lang).every(
            (s) => typeof s === "string" && !s.includes("$"),
          ),
        ).toBe(true);
});
test("word-time native helper is canonical, protected from repair and included in font requirements", async () => {
  const p = project("WordClock", true);
  p.layers = [
    { ...layer("wordTime"), wordLanguage: "zh", garminFont: "systemXTiny" },
  ];
  p.files = localGenerate(p);
  p.codeRevision = p.revision;
  expect(generationRequirements(p).languages).toEqual(["eng", "zhs", "zht"]);
  expect(generationRequirements(p).glyphs).toContain("午");
  expect(() => validateProject(p)).not.toThrow();
  const single = {
    ...p,
    layers: [{ ...p.layers[0], wordRow: "bottom" as const }],
  };
  expect(
    localGenerate(single).find((f) => f.path === "source/App.mc")!.content,
  ).toContain("rows[2]");
  expect(() =>
    validateProject({ ...p, layers: [{ ...p.layers[0], wordRow: "bad" }] }),
  ).toThrow(/报时行/);

  expect(() =>
    repairPayload(p, ["source/GfcWordTime.mc"], "log", profile),
  ).toThrow();
  const previous = globalThis.fetch;
  let payload: any;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                files: [
                  { path: "manifest.xml", content: "<manifest/>" },
                  {
                    path: "monkey.jungle",
                    content: "project.manifest=manifest.xml",
                  },
                  { path: "source/App.mc", content: "// app" },
                  {
                    path: "source/GfcWordTime.mc",
                    content: "// OVERRIDE_SENTINEL",
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
  };
  try {
    const result = await generate(
      profile,
      p,
      "test",
      new AbortController().signal,
    );
    expect(result.find((f) => f.path === "source/GfcWordTime.mc")).toEqual(
      nativeWordTimeFiles(p)[0],
    );
  } finally {
    globalThis.fetch = previous;
  }
  const design = JSON.parse(payload.messages[1].content).design;
  expect(design.nativeWordTimeHelpers).toEqual([
    { path: "source/GfcWordTime.mc", managed: true },
  ]);
  expect(JSON.stringify(payload)).not.toContain("class GfcWordTime");
  expect(JSON.stringify(payload)).not.toContain(profile.key);
});
test("word-time language selection previews Chinese and every standalone source export retains MIT originals", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("WordClock"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "文字报时", exact: true }).click();
  await page.getByLabel("报时语言", { exact: true }).selectOption("zh");
  await expect(page.locator('svg.watch [data-word-language="zh"]')).toHaveCount(
    1,
  );
  await expect(page.locator('svg.watch [data-word-line="2"]')).toHaveText(
    "十点了",
  );
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const bytes = await readFile((await (await pending).path())!);
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
  for (const name of [
    "AboutTime-LICENSE.txt",
    "AboutTime-English-strings.xml",
    "AboutTime-Chinese-strings.xml",
  ])
    expect(files.has("notices/" + name)).toBe(true);
  const meta = JSON.parse(files.get("gfc-export.json")!.toString());
  expect(meta.wordTimeLocale.commit).toBe(
    "4fdf09bcf784ecf385b9dce546af3f277e13caa5",
  );
  expect(
    meta.templateSources.some(
      (t: any) =>
        t.sourceFile === "frontend/src/wordTime.ts" && t.sourceContext,
    ),
  ).toBe(true);
  await page.getByLabel("报时行", { exact: true }).selectOption("bottom");
  await expect(page.locator("svg.watch [data-word-line]")).toHaveCount(1);
  await expect(page.locator('svg.watch [data-word-line="2"]')).toHaveText(
    "十点了",
  );
});
