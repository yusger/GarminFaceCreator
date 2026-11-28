import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { convertThemePackage } from "./theme-project-package.mjs";
import { importLocalFont } from "../frontend/src/localFonts.ts";
const source = "resources/examples/theme-project-v1";
async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "gfc-theme-package-"));
  try {
    await cp(source, dir, { recursive: true });
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const json = async (dir, name) =>
  JSON.parse(await readFile(join(dir, name), "utf8"));
async function save(dir, name, data) {
  await writeFile(join(dir, name), JSON.stringify(data, null, 2) + "\n");
  const m = await json(dir, "publish.json"),
    f = m.files.find((f) => f.path === name),
    bytes = await readFile(join(dir, name));
  if (f) {
    f.bytes = bytes.length;
    f.sha256 = createHash("sha256").update(bytes).digest("hex");
    await writeFile(
      join(dir, "publish.json"),
      JSON.stringify(m, null, 2) + "\n",
    );
  }
}
test("three-theme two-target package converts all 84 cases, preserves roles and produces each target source", async () => {
  const r = await convertThemePackage(source);
  assert.equal(r.report.cases, 84);
  assert.equal(r.project.fontRoles.length, 3);
  assert.equal(r.targets.length, 2);
  for (const t of r.targets) {
    assert(t.files.some((f) => f.path === "source/App.mc"));
    assert(t.files.some((f) => f.content.includes("Gfc_Source_")));
  }
  assert.equal(r.report.sdk, "not run");
});
for (const [name, mutate, pattern] of [
  [
    "unknown root code metadata",
    (p) => {
      p.codeProvenance = { injected: true };
    },
    /Design/,
  ],
  [
    "unknown nested field",
    (p) => {
      p.layers[0].javascript = "alert(1)";
    },
    /Design/,
  ],
  [
    "source files rejected",
    (p) => {
      p.files = [{ path: "source/Evil.mc", content: "injected" }];
    },
    /Design/,
  ],
  [
    "font role forged",
    (p) => {
      p.fontRoles[0].fontId = "unapproved";
    },
    /字体/,
  ],
  [
    "unknown theme reference",
    (p) => {
      p.themes.presets[0].layerIds.push("missing-layer");
    },
    /主题/,
  ],
  [
    "master mismatch rejected",
    (p) => {
      p.multiDevice.master[0].x += 10;
    },
    /适配/,
  ],
  [
    "inline images rejected",
    (p) => {
      p.layers[0].image = "data:image/png;base64,AAAA";
    },
    /Design/,
  ],
])
  test(name, () =>
    fixture(async (dir) => {
      const p = await json(dir, "design.json");
      mutate(p);
      await save(dir, "design.json", p);
      await assert.rejects(convertThemePackage(dir), pattern);
    }),
  );
test("missing matrix cell rejected", () =>
  fixture(async (dir) => {
    const c = await json(dir, "cases.json");
    c.cases = c.cases.filter(
      (c) =>
        !(
          c.themeId === "vital" &&
          c.target === "venu441mm" &&
          c.mode === "aod" &&
          c.scenario === "zero"
        ),
    );
    await save(dir, "cases.json", c);
    await assert.rejects(convertThemePackage(dir), /matrix/);
  }));
test("fake zero scenario rejected", () =>
  fixture(async (dir) => {
    const c = await json(dir, "cases.json");
    c.cases.find((c) => c.scenario === "zero").data.values.heartRate = 72;
    await save(dir, "cases.json", c);
    await assert.rejects(convertThemePackage(dir), /Zero/);
  }));
test("wrong reading is not accepted even with recomputed inventory", () =>
  fixture(async (dir) => {
    const c = await json(dir, "cases.json");
    c.cases[0].expect.readings["apex-time"] = "12:00";
    await save(dir, "cases.json", c);
    await assert.rejects(convertThemePackage(dir), /Reading mismatch/);
  }));
test("missing source option case rejected", () =>
  fixture(async (dir) => {
    const c = await json(dir, "cases.json");
    c.cases = c.cases.filter((c) => c.scenario !== "source");
    await save(dir, "cases.json", c);
    await assert.rejects(convertThemePackage(dir), /data-source/);
  }));
test("resource bytes cannot diverge from inventory", () =>
  fixture(async (dir) => {
    await writeFile(join(dir, "LICENSE.txt"), "changed");
    await assert.rejects(convertThemePackage(dir), /fingerprint/);
  }));
test("unsafe path rejected before resource access", () =>
  fixture(async (dir) => {
    const m = await json(dir, "publish.json");
    m.files[0].path = "../outside.json";
    await save(dir, "publish.json", m);
    await assert.rejects(convertThemePackage(dir), /Unsafe/);
  }));
test("undeclared resource rejected", () =>
  fixture(async (dir) => {
    await writeFile(join(dir, "extra.js"), "bad");
    await assert.rejects(convertThemePackage(dir), /Undeclared/);
  }));
test("dimension mismatch rejected", () =>
  fixture(async (dir) => {
    const m = await json(dir, "publish.json"),
      name = m.previews[0].file,
      b = await readFile(join(dir, name));
    b.writeUInt32BE(390, 16);
    await writeFile(join(dir, name), b);
    const f = m.files.find((f) => f.path === name);
    f.sha256 = createHash("sha256").update(b).digest("hex");
    await save(dir, "publish.json", m);
    await assert.rejects(convertThemePackage(dir), /PNG/);
  }));
test("licensed external TTF is hydrated with content-derived identity and full notice", () =>
  fixture(async (dir) => {
    const bytes = await readFile("resources/shared/fonts/Rajdhani-Bold.ttf"),
      license = await readFile(
        "resources/shared/fonts/Rajdhani-Bold-LICENSE.txt",
        "utf8",
      ),
      font = await importLocalFont(
        new File([bytes], "Rajdhani-Bold.ttf"),
        license,
        "Test local package",
      );
    await mkdir(join(dir, "resources"));
    await writeFile(join(dir, "resources/font.ttf"), bytes);
    await writeFile(join(dir, "resources/OFL.txt"), license);
    const p = await json(dir, "design.json");
    for (const l of [...p.layers, ...p.multiDevice.master])
      if (l.id === "apex-time")
        l.customFont = { id: font.id, file: font.file, family: font.family };
    p.fontRoles[0].fontId = font.id;
    await save(dir, "design.json", p);
    const m = await json(dir, "publish.json");
    m.fonts = [
      {
        kind: "ttf",
        id: font.id,
        family: font.family,
        file: "resources/font.ttf",
        noticeFile: "resources/OFL.txt",
        source: font.source,
      },
    ];
    for (const [path, role] of [
      ["resources/font.ttf", "font"],
      ["resources/OFL.txt", "notice"],
    ]) {
      const b = await readFile(join(dir, path));
      m.files.push({
        path,
        role,
        bytes: b.length,
        sha256: createHash("sha256").update(b).digest("hex"),
      });
    }
    await save(dir, "publish.json", m);
    const r = await convertThemePackage(dir);
    assert.equal(r.project.localFonts[0].license, license.trim());
    assert.equal(r.project.localFonts[0].id, font.id);
    m.fonts[0].id = "forged";
    await save(dir, "publish.json", m);
    await assert.rejects(convertThemePackage(dir), /identity/);
  }));
import { fontMaskPng } from "../frontend/src/fontMaskPng.ts";
import { createBitmapFontAsset } from "../frontend/src/bitmapFonts.ts";
test("external BMF descriptor, atlas, full license and referenced glyphs hydrate atomically", () =>
  fixture(async (dir) => {
    const rgba = new Uint8ClampedArray(16 * 16 * 4);
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 8; x++) rgba[(y * 16 + x) * 4 + 3] = 255;
    const atlas = await fontMaskPng(16, 16, rgba),
      descriptor =
        'info face="GFC Package Test" size=12 unicode=1\ncommon lineHeight=12 base=10 scaleW=16 scaleH=16 pages=1 packed=0\npage id=0 file="test.png"\nchars count=3\nchar id=32 x=0 y=0 width=0 height=0 xoffset=0 yoffset=0 xadvance=3 page=0 chnl=15\nchar id=65 x=0 y=0 width=4 height=12 xoffset=0 yoffset=0 xadvance=6 page=0 chnl=15\nchar id=86 x=4 y=0 width=4 height=12 xoffset=0 yoffset=0 xadvance=6 page=0 chnl=15\nkernings count=0\n',
      license = "Original synthetic GFC test glyphs; CC0-1.0",
      font = createBitmapFontAsset(descriptor, atlas, license, "GFC tests");
    await mkdir(join(dir, "resources"));
    await writeFile(join(dir, "resources/font.fnt"), descriptor);
    await writeFile(
      join(dir, "resources/test.png"),
      Buffer.from(atlas.split(",")[1], "base64"),
    );
    await writeFile(join(dir, "resources/NOTICE.txt"), license);
    const p = await json(dir, "design.json");
    for (const l of [...p.layers, ...p.multiDevice.master])
      if (l.id.endsWith("-title")) {
        delete l.customFont;
        l.garminFont = "auto";
        l.bitmapFontId = font.id;
        l.size = 12;
        l.text = "AVA";
      }
    for (const v of p.multiDevice.variants)
      if (v.target === "venu441mm")
        for (const l of p.layers.filter((l) => l.id.endsWith("-title")))
          v.overrides[l.id] = { size: (12 * 454) / 390 };
    await save(dir, "design.json", p);
    const c = await json(dir, "cases.json");
    for (const sample of c.cases)
      for (const id of Object.keys(sample.expect.readings))
        if (id.endsWith("-title")) sample.expect.readings[id] = "AVA";
    await save(dir, "cases.json", c);
    const m = await json(dir, "publish.json");
    m.fonts = [
      {
        kind: "bitmap",
        id: font.id,
        family: font.family,
        file: "resources/font.fnt",
        atlas: "resources/test.png",
        noticeFile: "resources/NOTICE.txt",
        source: font.source,
      },
    ];
    for (const [path, role] of [
      ["resources/font.fnt", "font"],
      ["resources/test.png", "font"],
      ["resources/NOTICE.txt", "notice"],
    ]) {
      const b = await readFile(join(dir, path));
      m.files.push({
        path,
        role,
        bytes: b.length,
        sha256: createHash("sha256").update(b).digest("hex"),
      });
    }
    await save(dir, "publish.json", m);
    const r = await convertThemePackage(dir);
    assert.equal(r.project.bitmapFonts[0].id, font.id);
    assert.equal(r.project.bitmapFonts[0].license, license);
    m.fonts[0].atlas = "resources/absent.png";
    await save(dir, "publish.json", m);
    await assert.rejects(convertThemePackage(dir), /inventory role/);
  }));
test("wrong threshold color cannot pass with correct readings and hashes", () =>
  fixture(async (dir) => {
    const c = await json(dir, "cases.json"),
      sample = c.cases.find((c) => c.scenario === "threshold");
    sample.expect.colors["apex-reading"] = "#123456";
    await save(dir, "cases.json", c);
    await assert.rejects(convertThemePackage(dir), /Color mismatch/);
  }));
