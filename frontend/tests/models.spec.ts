import { test, expect } from "@playwright/test";
import { completionParameters } from "../src/api";
import type { Profile } from "../src/domain";
const base: Profile = {
  id: "A",
  name: "模型A",
  url: "https://api.example.com/v1",
  model: "normal",
  key: "",
  remember: false,
  temperature: 0.3,
  tokens: 8192,
};
test("completion parameters honor provider protocol, reasoning and supported metadata", () => {
  expect(
    completionParameters({
      ...base,
      url: "https://api.openai.com/v1",
      model: "gpt-5.4",
    }),
  ).toEqual({ max_completion_tokens: 8192 });
  expect(
    completionParameters({
      ...base,
      url: "https://openrouter.ai/api/v1",
      model: "openai/o3",
    }),
  ).toEqual({ max_tokens: 8192 });
  expect(
    completionParameters({
      ...base,
      url: "https://openrouter.ai/api/v1",
      model: "openai/gpt-5.4",
      modelParameters: { "openai/gpt-5.4": ["temperature", "max_tokens"] },
    }),
  ).toEqual({ max_tokens: 8192, temperature: 0.3 });
  expect(
    completionParameters({
      ...base,
      url: "https://api.deepseek.com",
      thinking: true,
    }),
  ).toEqual({ max_tokens: 8192, thinking: { type: "enabled" } });
  expect(
    completionParameters({
      ...base,
      url: "https://api.deepseek.com",
      thinking: false,
    }),
  ).toMatchObject({ temperature: 0.3, thinking: { type: "disabled" } });
  expect(
    completionParameters({
      ...base,
      modelParameters: { normal: ["max_tokens"] },
    }),
  ).not.toHaveProperty("temperature");
  expect(
    completionParameters({
      ...base,
      tokenParameter: "max_completion_tokens",
      temperatureMode: "omit",
    }),
  ).toEqual({ max_completion_tokens: 8192 });
});
test("generation model selection does not reorder saved default configuration", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "A",
          name: "模型A",
          url: "https://api.example.com/v1",
          model: "model-a",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 8192,
        },
        {
          id: "B",
          name: "模型B",
          url: "https://second.example.com/v1",
          model: "model-b",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 8192,
        },
      ]),
    ),
  );
  let selected = "";
  await page.route(
    "https://second.example.com/v1/chat/completions",
    (route) => {
      selected = route.request().postDataJSON().model;
      return route.fulfill({
        json: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  files: [
                    { path: "manifest.xml", content: "<manifest/>" },
                    {
                      path: "monkey.jungle",
                      content: "project.manifest=manifest.xml",
                    },
                    { path: "source/App.mc", content: "// fixture" },
                  ],
                }),
              },
            },
          ],
        },
      });
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "使用 ClownWatch", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByLabel("本次生成模型").selectOption("B");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await expect(page.getByText("3 个文件待审阅")).toBeVisible();
  expect(selected).toBe("model-b");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("gfc-profiles")!)[0].id,
    ),
  ).toBe("A");
});
test("profile switching preserves each key, address changes clear input and draft caching excludes secrets", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("gfc-profiles")) return;
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "A",
          name: "模型A",
          url: "https://api.example.com/v1",
          model: "model-a",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 8192,
        },
        {
          id: "B",
          name: "模型B",
          url: "https://second.example.com/v1",
          model: "model-b",
          key: "saved-secret-B",
          remember: true,
          temperature: 0.2,
          tokens: 8192,
        },
      ]),
    );
    sessionStorage.setItem("gfc-key-A", "session-secret-A");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  const key = page.locator('input[autocomplete="off"]');
  await expect(key).toHaveValue("session-secret-A");
  await page
    .getByRole("button", { name: "显示或隐藏密钥", exact: true })
    .click();
  await page.locator(".profile-card").filter({ hasText: "模型B" }).click();
  await expect(key).toHaveValue("saved-secret-B");
  await expect(key).toHaveAttribute("type", "password");
  await page.locator(".profile-card").filter({ hasText: "模型A" }).click();
  await expect(key).toHaveValue("session-secret-A");
  await page
    .getByLabel("Base URL", { exact: true })
    .fill("https://changed.example.com/v1");
  await expect(key).toHaveValue("");
  await page.locator(".profile-card").filter({ hasText: "模型B" }).click();
  await expect(key).toHaveValue("saved-secret-B");
  const draft = await page.evaluate(() =>
    localStorage.getItem("gfc-profile-drafts"),
  );
  expect(draft).not.toContain("session-secret-A");
  expect(draft).not.toContain("saved-secret-B");
  await page.reload();
  await page.getByRole("button", { name: "模型配置", exact: true }).click();
  await expect(page.getByLabel("Base URL", { exact: true })).toHaveValue(
    "https://changed.example.com/v1",
  );
  await expect(key).toHaveValue("");
  await page.locator(".profile-card").filter({ hasText: "模型B" }).click();
  await expect(key).toHaveValue("saved-secret-B");
});
