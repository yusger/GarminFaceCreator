import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function png(page: any, name: string) {
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return readFile((await (await wait).path())!);
}
for (const size of ["45mm", "41mm"])
  test(
    "browser pure watchface capture " +
      size +
      " has actual pixels and fixed repeatable samples",
    async ({ page }) => {
      page.on("dialog", (d) => d.accept("Capture-" + size));
      await page.goto("/");
      await page.getByRole("button", { name: /^空白画布/ }).click();
      await page.getByLabel("手表尺寸").selectOption(size);
      await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
      await page.getByRole("button", { name: "创建项目", exact: true }).click();
      await page.getByRole("button", { name: "时间", exact: true }).click();
      await page.getByRole("button", { name: "预览", exact: true }).click();
      await page.getByLabel("模拟时间").fill("10:24");
      const a = await png(page, "下载亮屏盘面"),
        b = await png(page, "下载亮屏盘面"),
        dim = size === "45mm" ? 454 : 390;
      expect(a.readUInt32BE(16)).toBe(dim);
      expect(a.readUInt32BE(20)).toBe(dim);
      expect(a.equals(b)).toBe(true);
      const dark = await png(page, "下载息屏盘面");
      expect(dark.readUInt32BE(16)).toBe(dim);
      expect(dark.equals(a)).toBe(false);
      await expect(page.getByRole("status")).toContainText("系统字体");
    },
  );
test("resource font capture embeds actual glyphs and fails explicitly when font is missing", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept("Capture-font"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByRole("button", { name: "字体素材库", exact: true }).click();
  await page
    .getByRole("button", { name: "应用等宽科技字", exact: true })
    .click();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.getByLabel("模拟时间").fill("10:24");
  const bytes = await png(page, "下载亮屏盘面");
  expect(bytes.length).toBeGreaterThan(500);
  const pixels=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=454;c.height=454;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,454,454).data;let count=0;for(let i=0;i<d.length;i+=4)if(d[i]>30&&d[i+1]>130&&d[i+2]>70)count++;return count;},bytes.toString('base64'));expect(pixels).toBeGreaterThan(100);
  await page.route("**/fonts/sonar-number-font.ttf", (r) =>
    r.fulfill({ status: 404, body: "" }),
  );
  await page.getByRole("button", { name: "下载亮屏盘面", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("截图失败");
});
