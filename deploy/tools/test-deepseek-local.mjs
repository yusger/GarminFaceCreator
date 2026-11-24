import { chromium } from "@playwright/test";
import path from "node:path";
const key = process.env.GFC_DEEPSEEK_KEY;
if (!key) throw Error("Missing process key");
const context = await chromium.launchPersistentContext(
  path.join(process.env.LOCALAPPDATA, "GarminFaceCreator", "Browser"),
  {
    channel: "msedge",
    headless: true,
    viewport: { width: 1600, height: 1000 },
  },
);
try {
  const page = await context.newPage();
  page.on("response", async (r) => {
    if (
      !r.url().includes("api.deepseek.com") ||
      !r.url().includes("chat/completions")
    )
      return;
    try {
      const j = await r.json();
      console.log(
        "DeepSeek response",
        r.status(),
        JSON.stringify({
          finish: j.choices?.[0]?.finish_reason,
          usage: j.usage,
          error: j.error?.type,
          contentLength: j.choices?.[0]?.message?.content?.length,
        }),
      );
    } catch {}
  });
  await page.exposeFunction("reportNotice", (text) =>
    console.log("Page notice:", String(text).replaceAll(key, "[redacted]")),
  );
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const text = document.querySelector("[role=alert]")?.textContent;
      if (text && text !== window.lastNotice) {
        window.lastNotice = text;
        window.reportNotice(text);
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  page.on("dialog", (d) =>
    d.accept(d.type() === "prompt" ? "DeepSeek真实生成测试" : undefined),
  );
  let leaked = false;
  page.on("response", async (r) => {
    if (r.url().endsWith("/api/builds") && r.status() >= 400)
      console.log(
        "Build validation:",
        (await r.text()).replaceAll(key, "[redacted]"),
      );
  });
  page.on("request", (r) => {
    if (r.url().includes("/api/builds") && (r.postData() || "").includes(key))
      leaked = true;
  });
  await page.goto(process.env.GFC_TEST_URL || "http://localhost:18380");
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  await page.getByLabel("模型服务商").selectOption("deepseek");
  await page.getByLabel("API Key", { exact: false }).first().fill(key);
  await page.locator("input[type=checkbox]").first().check();
  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "连接成功" })
    .waitFor({ timeout: 100000 });
  console.log("PASS real browser DeepSeek connection");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await page.getByText(/个文件待审阅/).waitFor({ timeout: 300000 });
  console.log("PASS real browser code generation");
  await page.getByRole("button", { name: "审阅代码", exact: true }).click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
  await page.waitForFunction(
    () => {
      const t = document.querySelector(".build-drawer pre")?.textContent || "";
      return /succeeded|failed|提交构建失败|Invalid|Mismatch|mismatch|Missing|Expected|Manifest|Empty|Empty|Invalid/.test(
        t,
      );
    },
    {},
    { timeout: 300000 },
  );
  const logs = await page.locator(".build-drawer pre").textContent();
  console.log(logs?.slice(-4500));
  if (leaked) throw Error("Key entered compile request");
  console.log("PASS compile requests contain no model key");
} finally {
  await context.close();
}
