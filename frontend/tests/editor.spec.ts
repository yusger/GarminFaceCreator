import { test, expect } from "@playwright/test";
import { parseFiles, validateProject, project } from "../src/domain";
test("reject unsafe generated paths and malformed imported projects", () => {
  expect(() =>
    parseFiles(
      JSON.stringify({ files: [{ path: "../run.sh", content: "bad" }] }),
    ),
  ).toThrow();
  expect(() =>
    validateProject({
      ...project(),
      layers: [{ kind: "image", image: "https://external.invalid/x.png" }],
    }),
  ).toThrow();
});
test("create, edit, drag, undo, preview threshold, persist and export", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("测试表盘"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "数据", exact: true }).click();
  await page.getByLabel("图层名称").fill("运动心率");
  await page.getByLabel("字号", { exact: true }).fill("31");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.getByLabel("模拟心率").fill("155");
  const text = page.locator("svg.watch text").filter({ hasText: "155" }).last();
  await expect(text).toHaveAttribute("fill", "#ff5566");
  await page.getByRole("button", { name: "关闭预览", exact: true }).click();
  const box = await text.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 30,
    box!.y + box!.height / 2 + 20,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("X", { exact: true })).not.toHaveValue("140");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("140");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 测试表盘" }).click();
  await expect(page.getByText("运动心率", { exact: true })).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  expect((await pending).suggestedFilename()).toBe("测试表盘.json");
  await page.getByText("运动心率", { exact: true }).click();
  await page.getByRole("button", { name: "删除图层", exact: true }).click();
  await page.getByText("心率", { exact: true }).first().click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/editor.png",
    fullPage: true,
  });
});
test("model profiles keep secret out of persistent config and generate reviewable code", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  await page.getByLabel("默认模型 ID").fill("test-code-model");
  await page
    .getByLabel("API Key", { exact: false })
    .first()
    .fill("local-test-key");
  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  const config = await page.evaluate(() =>
    localStorage.getItem("gfc-profiles"),
  );
  expect(config).not.toContain("local-test-key");
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some(
        (k) => sessionStorage.getItem(k) === "local-test-key",
      ),
    ),
  ).toBeTruthy();
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  files: [
                    { path: "manifest.xml", content: "<manifest/>" },
                    {
                      path: "monkey.jungle",
                      content: "project.manifest = manifest.xml",
                    },
                    {
                      path: "source/View.mc",
                      content: "// mocked response for integration test",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      });
    },
  );
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("连接成功");
  await page.screenshot({
    path: "docs/screenshots/model-settings.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "项目", exact: true }).click();
  page.on("dialog", (d) => d.accept("AI测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await expect(page.getByText("3 个文件待审阅")).toBeVisible();
  await page.getByRole("button", { name: "审阅代码", exact: true }).click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.route("**/api/capabilities", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "编译服务未连接",
  );
});
import { files } from "../../backend/tests/fixture.mjs";

test("remote build submits reviewed files, shows logs and downloads a real PRG", async ({
  page,
}) => {
  test.skip(
    !process.env.GFC_TEST_URL,
    "Requires the deployed compiler; does not start a local backend",
  );
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  await page.getByLabel("默认模型 ID").fill("test-code-model");
  await page
    .getByLabel("API Key", { exact: false })
    .first()
    .fill("local-test-key");
  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      const request = route.request().postDataJSON();
      const scene = JSON.parse(
        request.messages.find((m: { role: string }) => m.role === "user")
          .content,
      );
      const generated = Object.entries(files).map(([path, content]) => ({
        path,
        content: (content as string).replaceAll(
          "4c3f31fda59c4f9bb25c4f7774eca711",
          scene.design.appId,
        ),
      }));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          choices: [
            { message: { content: JSON.stringify({ files: generated }) } },
          ],
        }),
      });
    },
  );
  await page.getByRole("button", { name: "项目", exact: true }).click();
  page.on("dialog", (d) => d.accept("真实编译验证"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await expect(page.getByText("6 个文件待审阅")).toBeVisible();
  await page.getByRole("button", { name: "审阅代码", exact: true }).click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "BUILD SUCCESSFUL",
    { timeout: 100000 },
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: /^下载 .*\.prg$/ }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^Venu4_45mm_.+\.prg$/);
  expect(await download.failure()).toBeNull();
});

test("ClownWatch reference cannot be deleted and its independent copy compiles", async ({
  page,
}) => {
  test.skip(!process.env.GFC_TEST_URL, "Requires the deployed compiler");
  test.setTimeout(120000);
  await page.goto("/");
  const reference = page
    .locator(".reference-card")
    .filter({ hasText: "ClownWatch" });
  await expect(reference).toHaveCount(1);
  await expect(reference.getByText("默认参考 · 不可删除")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "删除 ClownWatch", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "ClownWatch 副本", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const original = await (
    await page.request.get("/templates/clownwatch.json")
  ).json();
  const copyAppId = await page.locator(".inspector code").textContent();
  expect(copyAppId).not.toBe(original.appId);
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await expect(page.locator(".build-drawer pre")).toContainText(
    "BUILD SUCCESSFUL",
    { timeout: 100000 },
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: /^下载 .*\.prg$/ }).click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(reference).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "删除 ClownWatch 副本", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "打开 ClownWatch 副本", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(reference).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "删除 ClownWatch", exact: true }),
  ).toHaveCount(0);
});

for (const name of ["SkyRing", "fine-o-clock"]) {
  test(
    name + " permanent reference creates a compilable independent copy",
    async ({ page }) => {
      test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
      test.setTimeout(180000);
      await page.goto("/");
      await expect(page.locator(".reference-card")).toHaveCount(8);
      await expect(
        page.getByRole("button", { name: "删除 " + name, exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "使用 " + name, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: name + " 副本", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("已保存到本机", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "编译", exact: true })
        .first()
        .click();
      await expect(page.locator(".build-drawer pre")).toContainText(
        "BUILD SUCCESSFUL",
        { timeout: 150000 },
      );
      const pending = page.waitForEvent("download");
      await page.getByRole("link", { name: /^下载 .*\.prg$/ }).click();
      expect(await (await pending).failure()).toBeNull();
      await page.getByRole("button", { name: "项目", exact: true }).click();
      await expect(page.locator(".reference-card")).toHaveCount(8);
    },
  );
}

test("new project cascades series model and size and persists selection", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("小屏跑表"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByLabel("手表系列").selectOption("Forerunner");
  await page.getByLabel("手表型号").selectOption("Forerunner 570");
  await page.getByLabel("手表尺寸").selectOption("42mm");
  await expect(page.getByRole("dialog")).toContainText("390 × 390");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.locator(".device")).toContainText("Forerunner 570 42mm");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 小屏跑表", exact: true })
    .click();
  await expect(page.locator(".device")).toContainText("390 × 390");
});

test("preview playback scenarios comparison and actual pixels do not change design", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("预览测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByLabel("手表尺寸").selectOption("41mm");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const revision = await page.locator(".right-status").textContent();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await expect(dialog.locator("svg.watch")).toHaveCount(2);
  await dialog.getByRole("button", { name: "运动", exact: true }).click();
  await expect(
    dialog.locator("svg.watch text").filter({ hasText: "155" }),
  ).toHaveAttribute("fill", "#ff5566");
  await dialog.getByRole("button", { name: "低电量", exact: true }).click();
  await expect(
    dialog.locator("svg.watch text").filter({ hasText: "8%" }),
  ).toHaveAttribute("fill", "#ff5566");
  await dialog.getByRole("button", { name: "数据缺失", exact: true }).click();
  await expect(
    dialog.locator("svg.watch text").filter({ hasText: "--" }).first(),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "归零", exact: true }).click();
  await expect(dialog.getByLabel("模拟秒数")).toHaveValue("0");
  await expect(dialog.locator("svg.watch line[opacity='1']")).toHaveCount(0);
  await dialog.getByRole("button", { name: "播放动画", exact: true }).click();
  await expect(dialog.getByLabel("模拟秒数")).not.toHaveValue("0", {
    timeout: 4000,
  });
  await dialog.getByRole("button", { name: "暂停动画", exact: true }).click();
  const seconds = await dialog.getByLabel("模拟秒数").inputValue();
  await page.waitForTimeout(1200);
  await expect(dialog.getByLabel("模拟秒数")).toHaveValue(seconds);
  await dialog.getByLabel("预览查看尺寸").selectOption("实际像素");
  expect(
    Math.round(
      (await dialog.locator(".preview-watch").first().boundingBox())!.width,
    ),
  ).toBe(390);
  await dialog.getByLabel("预览显示模式").selectOption("息屏");
  await expect(dialog.locator("svg.watch")).toHaveCount(1);
  await expect(dialog.locator("svg.watch text")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".right-status")).toHaveText(revision!);
});

test("live preview uses current clock, random heart rate and increasing steps", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-24T12:34:50") });
  await page.goto("/");
  page.on("dialog", (d) => d.accept("实时预览测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await expect(dialog.getByLabel("实时模拟")).toBeChecked();
  await expect(dialog.getByLabel("模拟步数")).toHaveValue("4500");
  const current = await page.evaluate(() => {
    const d = new Date();
    return (
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  });
  await expect(dialog.getByLabel("模拟时间")).toHaveValue(current);
  await page.clock.runFor(2100);
  const steps = Number(await dialog.getByLabel("模拟步数").inputValue());
  expect(steps).toBeGreaterThan(4500);
  expect(steps).toBeLessThanOrEqual(4510);
  const hr = Number(await dialog.getByLabel("模拟心率").inputValue());
  expect(hr).toBeGreaterThanOrEqual(50);
  expect(hr).toBeLessThanOrEqual(160);
  await dialog.getByRole("button", { name: "暂停动画", exact: true }).click();
  await page.clock.runFor(3000);
  await expect(dialog.getByLabel("模拟步数")).toHaveValue(String(steps));
  await dialog.getByRole("button", { name: "播放动画", exact: true }).click();
  await page.clock.runFor(1100);
  expect(
    Number(await dialog.getByLabel("模拟步数").inputValue()),
  ).toBeGreaterThan(steps);
  await dialog.getByLabel("模拟心率").fill("120");
  await expect(dialog.getByLabel("实时模拟")).not.toBeChecked();
  await page.clock.runFor(2100);
  await expect(dialog.getByLabel("模拟心率")).toHaveValue("120");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(dialog.getByLabel("模拟步数")).toHaveValue("4500");
});

test("provider presets fill URL and model and isolate credentials", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  await page.getByLabel("模型服务商").selectOption("deepseek");
  await expect(page.getByLabel("Base URL", { exact: true })).toHaveValue(
    "https://api.deepseek.com",
  );
  await expect(page.getByLabel("默认模型 ID", { exact: false })).toHaveValue(
    "deepseek-flash",
  );
  await page.getByLabel("预设模型").selectOption("deepseek-v4-pro");
  await expect(page.getByLabel("默认模型 ID", { exact: false })).toHaveValue(
    "deepseek-v4-pro",
  );
  await page
    .getByLabel("API Key", { exact: false })
    .first()
    .fill("test-secret-never-real");
  await page.getByLabel("模型服务商").selectOption("gemini");
  await expect(
    page.getByLabel("API Key", { exact: false }).first(),
  ).toHaveValue("");
  await expect(page.getByLabel("Base URL", { exact: true })).toHaveValue(
    "https://generativelanguage.googleapis.com/v1beta/openai",
  );
  await page.getByLabel("预设模型").selectOption("__custom");
  await page
    .getByLabel("默认模型 ID", { exact: false })
    .fill("my-custom-model");
  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  await expect(page.getByLabel("默认模型 ID", { exact: false })).toHaveValue(
    "my-custom-model",
  );
});

test("SkyRing uses editable layers and bound live preview instead of a screenshot", async ({
  page,
}) => {
  await page.goto("/");
  const ref = await (await page.request.get("/templates/skyring.json")).json();
  expect(ref.layers.length).toBeGreaterThan(20);
  expect(ref.layers.some((l: any) => l.kind === "image")).toBe(false);
  expect(
    ref.layers.some((l: any) => l.kind === "metric" && l.source === "steps"),
  ).toBe(true);
  await page.getByRole("button", { name: "使用 SkyRing", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "SkyRing 副本", exact: true }),
  ).toBeVisible();
  await expect(page.locator("svg.watch image")).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/skyring-layered.png",
    fullPage: true,
  });
  await page.getByText("步数", { exact: true }).first().click();
  await expect(page.getByLabel("数据源", { exact: true })).toHaveValue("steps");
  await page.getByLabel("X", { exact: true }).fill("140");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("140");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await dialog.getByLabel("模拟步数").fill("12345");
  await expect(
    dialog.locator("svg.watch text").filter({ hasText: "12,345" }),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  expect(
    (await (await page.request.get("/templates/skyring.json")).json()).layers,
  ).toEqual(ref.layers);
});
