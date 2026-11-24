import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { imageFiles, png } from "../../backend/tests/image-fixture.mjs";
test("uploaded images survive export/import and compile with a bitmap font without image data in model request", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "image-test",
          name: "测试模型",
          url: "https://api.example.com/v1",
          model: "mock",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 8192,
        },
      ]),
    );
  });
  await page.goto("/");
  page.on("dialog", (d) => d.accept("图片链路测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  for (const [name, color] of [
    ["红色 图片 & 1.png", [255, 0, 0]],
    ["蓝色(2).png", [0, 100, 255]],
  ] as const) {
    await page
      .locator('input[accept="image/png,image/jpeg,image/webp"]')
      .setInputFiles({ name, mimeType: "image/png", buffer: png(...color) });
    await expect(page.getByLabel("图层名称")).toHaveValue(name);
    await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  }
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const downloaded = await pending;
  const exported = JSON.parse(
    await readFile((await downloaded.path())!, "utf8"),
  );
  expect(exported.storageVersion ?? 0).toBeGreaterThanOrEqual(0);
  exported.assets = [
    {
      path: "resources/fonts/font.png",
      data: "data:image/png;base64," + png(255, 255, 255).toString("base64"),
    },
  ];
  // Exported p may predate storage metadata updates; use a nonzero version to exercise imported copies.
  exported.storageVersion = 9;
  await page
    .locator('input[accept=".json"]')
    .setInputFiles({
      name: "导入图片.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator("svg.watch image")).toHaveCount(2);
  let requested = false;
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      const body = route.request().postData()!;
      expect(body).not.toContain("data:image/");
      const scene = JSON.parse(
        route.request().postDataJSON().messages[1].content,
      ).design;
      const paths = scene.layers
        .filter((l: any) => l.asset)
        .map((l: any) => l.asset);
      expect(paths).toHaveLength(2);
      expect(
        paths.every((p: string) => /^assets\/[a-f0-9-]+\.png$/.test(p)),
      ).toBe(true);
      const files = Object.entries(imageFiles(scene.appId, paths)).map(
        ([path, content]) => ({ path, content }),
      );
      requested = true;
      await route.fulfill({
        json: {
          choices: [{ message: { content: JSON.stringify({ files }) } }],
        },
      });
    },
  );
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await expect(page.getByText("9 个文件待审阅")).toBeVisible();
  expect(requested).toBe(true);
  await page.getByRole("button", { name: "审阅代码", exact: true }).click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "BUILD SUCCESSFUL",
    { timeout: 150000 },
  );
});
