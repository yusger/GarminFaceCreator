import { test, expect } from "@playwright/test";
import { graphicsCapabilities, validateGraphics } from "../src/graphics";
import { project, layer } from "../src/domain";
test("enhanced graphics require verified device capability rather than display assumption", () => {
  expect(graphicsCapabilities({ target: "venu445mm" })).toMatchObject({
    alphaBlending: true,
    colorBits: 16,
  });
  expect(() =>
    validateGraphics({
      ...project(),
      target: "unverified",
      layers: [{ ...layer("rect"), opacity: 0.5 }],
    }),
  ).toThrow(/尚未验证/);
});
test("shape stroke fill radius and alpha persist and reach native generation metadata", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("形状样式"));
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "矩形", exact: true }).click();
  await page.getByLabel("启用描边", { exact: true }).check();
  await page.getByLabel("描边颜色", { exact: true }).fill("#ff0000");
  await page.getByLabel("线宽", { exact: true }).fill("5");
  await page.getByLabel("形状不透明度", { exact: true }).fill("0.5");
  await page.getByLabel("圆角半径", { exact: true }).fill("12");
  const shape = page
    .locator("svg.watch g[data-layer]")
    .last()
    .locator("rect")
    .first();
  await expect(shape).toHaveAttribute("stroke", "#ff0000");
  await expect(shape).toHaveAttribute("stroke-opacity", "0.5");
  await expect(shape).toHaveAttribute("rx", "12");
  await page.getByLabel("填充形状", { exact: true }).uncheck();
  await expect(shape).toHaveAttribute("fill", "none");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 形状样式", exact: true })
    .click();
  await expect(
    page.locator("svg.watch g[data-layer]").last().locator("rect").first(),
  ).toHaveAttribute("stroke-opacity", "0.5");
});
