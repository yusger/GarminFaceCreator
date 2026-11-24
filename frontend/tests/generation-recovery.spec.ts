import { test, expect } from "@playwright/test";
import { parseFiles, project } from "../src/domain";
import { generate, GenerationFailure } from "../src/api";
const files = [
  { path: "manifest.xml", content: "<manifest/>" },
  { path: "monkey.jungle", content: "project.manifest=manifest.xml" },
  { path: "source/App.mc", content: '// { braces } " escaped \\"' },
];
const valid = JSON.stringify({ files });
test("safe JSON extraction accepts only a complete unique candidate and retains path checks", () => {
  expect(parseFiles(valid)).toEqual(files);
  expect(parseFiles("解释\n```json\n" + valid + "\n```\n结束")).toEqual(files);
  for (const value of [
    valid + "\n" + valid,
    "```json\n" + valid + "\n```\n```json\n" + valid + "\n```",
    "```json\n" + valid,
    "前言 { broken " + valid + " 后记",
    "```json\n" + valid.slice(0, -5) + "\n```",
    JSON.stringify({
      files: [...files, { path: "../escape.mc", content: "bad" }],
    }),
    JSON.stringify({
      files: [...files, { path: "source/app.mc", content: "duplicate" }],
    }),
    "null",
  ])
    expect(() => parseFiles(value)).toThrow();
});
test("truncated model output keeps raw response in typed failure", async () => {
  const original = globalThis.fetch;
  const raw = valid.slice(0, -8);
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "length", message: { content: raw } }],
      }),
      { headers: { "content-type": "application/json" } },
    );
  try {
    await expect(
      generate(
        {
          id: "test",
          name: "test",
          url: "https://api.example.com/v1",
          model: "test",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 2048,
        },
        project(),
        "test",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ raw, message: expect.stringContaining("截断") });
  } finally {
    globalThis.fetch = original;
  }
});
test("failed generation displays raw as text and preserves already applied native project", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "raw",
          name: "测试",
          url: "https://api.example.com/v1",
          model: "test",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 2048,
        },
      ]),
    ),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const raw =
    '说明 <script>window.unsafeResult=1</script>\n```json\n{"files":[';
  await page.route("https://api.example.com/v1/chat/completions", (route) =>
    route.fulfill({
      json: {
        choices: [{ finish_reason: "length", message: { content: raw } }],
      },
    }),
  );
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await expect(page.getByLabel("模型原始返回")).toHaveValue(raw);
  await expect(page.locator(".generation-failure")).toContainText("截断");
  expect(
    await page.evaluate(() => (window as any).unsafeResult),
  ).toBeUndefined();
  await page.getByRole("button", { name: "代码", exact: true }).click();
  await expect(page.getByLabel("代码文件").locator("option")).not.toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "应用生成结果", exact: true }),
  ).toHaveCount(0);
});
