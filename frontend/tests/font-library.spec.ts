import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { missingGlyphs, libraryFonts, fontPatch } from "../src/fontLibrary";
import { project, layer, validateProject } from "../src/domain";
import { chalkPlans } from "../src/chalkFonts";
test("font catalog has real files, licenses and deterministic glyph coverage", async () => {
  for (const f of libraryFonts) {
    const bytes = await readFile("resources/shared/fonts/" + f.file);
    expect(
      missingGlyphs(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "0123456789:",
      ),
    ).toEqual([]);
    expect(
      await readFile(
        "resources/shared/fonts/" + f.file.replace(".ttf", "-LICENSE.txt"),
        "utf8",
      ),
    ).toContain(f.license==="Apache-2.0"?"Apache License":"FONT LICENSE");
    const p = project("Font", true);
    p.layers = [{ ...layer("time"), ...fontPatch(f.id) }];
    validateProject(p);
    expect(chalkPlans(p).some((plan) => plan.font === f.file)).toBe(true);
  }
  const bytes = await readFile("resources/shared/fonts/sonar-number-font.ttf");
  expect(
    missingGlyphs(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "中文",
    ).length,
  ).toBe(2);
});
test("font browser previews actual assets, flags missing glyphs and applies with undo", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Fonts"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await page.getByLabel("字体检查文字").fill("09:41 中文");
  const card = page
    .locator(".font-cards article")
    .filter({ hasText: "等宽科技字" });
  await expect(card.getByRole("status")).toContainText("缺字");
  await card.getByRole("button", { name: "应用等宽科技字" }).click();
  await expect(page.getByRole("dialog", { name: "字体素材库" })).toBeHidden();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const p = JSON.parse(await readFile((await (await wait).path())!, "utf8"));
  expect(p.layers[0].customFont.file).toBe("sonar-number-font.ttf");
  await page.getByTitle("撤销", { exact: true }).click();
  await page.getByTitle("重做", { exact: true }).click();
});
