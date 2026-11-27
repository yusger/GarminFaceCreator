import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { layer, project, validateProject } from "../src/domain";
import { chalkPlans } from "../src/chalkFonts";
import { missingGlyphs, fontPatch } from "../src/fontLibrary";
test("font plans derive actual dynamic variants, prefix separators and AOD requirements", () => {
  const p = project("Glyphs", true),
    metric = {
      ...layer("metric"),
      ...fontPatch("sonar_number_font"),
      source: "steps",
      autoSourceFormat: true,
      aod: false,
      readoutSample: "NOT_NATIVE",
    };
  p.layers = [
    metric,
    {
      ...layer("text"),
      ...fontPatch("sonar_label_font"),
      sourceLabelFor: metric.id,
      text: "OLD_LABEL",
      aod: false,
    },
  ];
  p.controls = [
    {
      id: "source",
      label: "Source",
      type: "dataSource",
      default: "steps",
      options: ["steps", "battery", "temperature"],
      targets: [{ layerId: metric.id, property: "source" }],
    },
  ];
  const plans = chalkPlans(p);
  expect(plans).toHaveLength(2);
  const numeric = plans.find((f) => f.font === "sonar-number-font.ttf")!.glyphs;
  expect(numeric).toContain("%");
  expect(numeric).toContain("°");
  expect(numeric).toContain(" ");
  expect(numeric).not.toContain("N");
  for(const c of "batt") expect(plans.find(f=>f.font === "sonar-label-font.ttf")!.glyphs).toContain(c);
});
test("default reference font requirements are covered by their actual licensed fonts", async () => {
  for (const id of ["sonar", "pulsemaniac"]) {
    const p = validateProject(
      JSON.parse(
        await readFile(
          `resources/default-watchfaces/${id}/design.json`,
          "utf8",
        ),
      ),
    );
    for (const plan of chalkPlans(p)) {
      const bytes = await readFile("resources/shared/fonts/" + plan.font);
      expect(
        missingGlyphs(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
          plan.glyphs,
        ),
        id + " " + plan.id,
      ).toEqual([]);
    }
  }
});
async function create(page: any, size = "45mm", kind = "时间") {
  page.on("dialog", (d: any) => d.accept("FontBudget"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("手表尺寸", { exact: true }).selectOption(size);
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: kind, exact: true }).click();
  await page.getByLabel("字号", { exact: true }).fill("24");
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await page
    .getByRole("button", { name: "应用等宽科技字", exact: true })
    .click();
}
test("font resource inspector rejects missing glyphs before raster fallback", async ({
  page,
}) => {
  await create(page, "45mm", "文字");
  await page.getByLabel("文字内容", { exact: true }).fill("中文");
  await page.getByRole("button", { name: "素材", exact: true }).click();
  const panel = page.locator("[data-resource-inspector]");
  await panel.locator(":scope > summary").click();
  await panel
    .getByRole("button", { name: "检查生成字体", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("缺少所需字符");
  await expect(panel.locator("[data-font-report]")).toHaveCount(0);
});
for (const size of ["45mm", "41mm"])
  test(`licensed font reports and native compilation ${size}`, async ({
    page,
  }) => {
    test.skip(process.env.GFC_TEST_SDK !== "1", "Explicit font SDK test");
    test.setTimeout(130000);
    await create(page, size);
    await page.getByRole("button", { name: "素材", exact: true }).click();
    const panel = page.locator("[data-resource-inspector]");
    await panel.locator(":scope > summary").click();
    await panel
      .getByRole("button", { name: "检查生成字体", exact: true })
      .click();
    await expect(panel.locator("[data-font-report]")).toHaveCount(1);
    await expect(panel).toContainText(
      (size === "45mm" ? "24" : "21") + "px · 11字形",
    );
    await page
      .getByRole("button", { name: "本地生成（试验）", exact: true })
      .click();
    await page
      .getByRole("button", { name: "应用生成结果", exact: true })
      .click();
    await page
      .getByRole("button", { name: "编译", exact: true })
      .first()
      .click();
    await expect(page.locator(".build-drawer pre")).toContainText("succeeded", {
      timeout: 110000,
    });
  });

test("font reports survive source-only changes and do not vanish after generating code",async({page})=>{
 await create(page);await page.getByRole("button",{name:"素材",exact:true}).click();const panel=page.locator("[data-resource-inspector]");await panel.locator(":scope > summary").click();await panel.getByRole("button",{name:"检查生成字体",exact:true}).click();await expect(panel.locator("[data-font-report]")).toHaveCount(1);await page.getByRole("button",{name:"本地生成（试验）",exact:true}).click();await page.getByRole("button",{name:"应用生成结果",exact:true}).click();await expect(page.getByText("已保存到本机",{exact:true})).toBeVisible();await expect(panel.locator("[data-font-report]")).toHaveCount(1);
});
