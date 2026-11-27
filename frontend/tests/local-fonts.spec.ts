import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  importLocalFont,
  fontBytes,
  validateLocalFonts,
  fontDataBytes,
} from "../src/localFonts";
import { project, layer, validateProject } from "../src/domain";
import { chalkPlans } from "../src/chalkFonts";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
import { generationHeader } from "../src/generationDto";
const path = "resources/shared/fonts/sonar-number-font.ttf";
async function fixture() {
  const bytes = new Uint8Array(await readFile(path));
  const font = await importLocalFont(
    new File([bytes], "Study.ttf"),
    "Test authorization; source retains its original license",
  );
  const p = project("LocalFont", true);
  p.localFonts = [font];
  p.layers = [
    {
      ...layer("time"),
      customFont: { id: font.id, family: font.family, file: font.file },
    },
  ];
  return p;
}
test("local font bytes validate, round-trip and reach native plans without entering model metadata", async () => {
  const p = await fixture();
  validateProject(p);
  expect(chalkPlans(p)[0].font).toBe(p.localFonts![0].file);
  expect((await fontBytes(p, p.localFonts![0].file)).byteLength).toBe(
    (await readFile(path)).length,
  );
  expect(JSON.stringify(generationHeader(p))).not.toContain(
    p.localFonts![0].data.slice(0, 80),
  );
  const history = saveDesignSnapshot(p, "font");
  expect(
    restoreDesignSnapshot(
      { ...history, localFonts: [] },
      history.activeDesignSnapshot!,
    ).localFonts,
  ).toEqual(p.localFonts);
  expect(() => validateProject({ ...p, localFonts: [] })).toThrow(/本地字体/);
});
test("malformed fonts, missing notices and duplicate identities reject before use", async () => {
  const p = await fixture(),
    f = p.localFonts![0];
  expect(() => validateLocalFonts({ localFonts: [f, f] })).toThrow();
  expect(() =>
    validateLocalFonts({ localFonts: [{ ...f, license: "" }] }),
  ).toThrow(/许可/);
  expect(() => fontDataBytes("data:font/ttf;base64,AAAA")).toThrow();
  await expect(fontBytes({ localFonts: [] }, f.file)).rejects.toThrow(/缺少/);
  const bytes = new Uint8Array(await readFile(path));
  await expect(
    importLocalFont(new File([bytes], "Study.ttf"), ""),
  ).rejects.toThrow(/授权/);
});
test("113 imports local bytes without uploading and retains them in exported project", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  page.on("dialog", (d) => d.accept("LocalFontUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await page
    .getByLabel("字体许可或授权说明")
    .fill("Local authorized font; original notices retained");
  await page.getByLabel("导入本地字体").setInputFiles(path);
  await expect(page.getByRole("dialog", { name: "字体素材库" })).toBeHidden();
  await expect
    .poll(() =>
      page.locator("svg.watch text").first().getAttribute("font-family"),
    )
    .toContain("GfcFace_local_");
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await wait).path())!, "utf8"),
  );
  expect(saved.localFonts).toHaveLength(1);
  expect(saved.localFonts[0].data).toContain("data:font/ttf;base64,");
  expect(writes).toEqual([]);
  await page.getByTitle("撤销", { exact: true }).click();
  await page.getByTitle("重做", { exact: true }).click();
});
