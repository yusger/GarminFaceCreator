import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import {
  repairPayload,
  mergeRepair,
  redactRepair,
  repairDiff,
} from "../src/repair";
const profile = {
  id: "repair",
  name: "Mock Repair",
  url: "https://api.example.com/v1",
  model: "mock",
  key: "test-secret-key",
  remember: false,
  temperature: 0.2,
  tokens: 2048,
};
test("repair only sends selected text and redacts credentials hosts and local paths", () => {
  const p = project("Clock", true);
  p.layers = [layer("time")];
  p.files = localGenerate(p);
  p.files[2].content +=
    "\n// password=hidden; 192.168.1.2 C:\\Users\\private\\source\\App.mc";
  const payload = JSON.stringify(
    repairPayload(p, ["source/App.mc"], "Bearer test-secret-key", profile),
  );
  expect(payload).not.toContain("hidden");
  expect(payload).not.toContain(profile.key);
  expect(payload).not.toContain("192.168.1.2");
  expect(payload).not.toContain("Users");
  expect(payload).not.toContain("manifest.xml");
  expect(payload).not.toContain("appId");
  expect(() => repairPayload(p, ["manifest.xml"], "", profile)).toThrow(
    /请选择/,
  );
  expect(() =>
    repairPayload(p, ["source/App.mc"], "x".repeat(16001), profile),
  ).toThrow(/最多/);
  expect(redactRepair("sk-abcdefgh12345678")).toBe("[REDACTED]");
});
test("repair patches cannot add files change identity or bypass normal path validation", () => {
  const p = project("Clock", true);
  p.files = localGenerate(p);
  const path = "source/App.mc";
  for (const bad of ["manifest.xml", "source/New.mc", "../run.sh"])
    expect(() =>
      mergeRepair(
        p,
        [path],
        JSON.stringify({ files: [{ path: bad, content: "bad" }] }),
      ),
    ).toThrow(/未授权/);
  const content =
    p.files.find((f) => f.path === path)!.content + "\n// repaired";
  const next = mergeRepair(
    p,
    [path],
    JSON.stringify({ files: [{ path, content }] }),
  );
  expect(next.find((f) => f.path === "manifest.xml")).toEqual(
    p.files.find((f) => f.path === "manifest.xml"),
  );
  expect(repairDiff("one\ntwo\nthree", "one\nchanged\nthree")).toEqual({
    line: 2,
    removed: "two",
    added: "changed",
  });
});
test("manual repair previews diff records patch provenance and enforces two requests", async ({
  page,
}) => {
  await page.addInitScript((profile) => {
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([{ ...profile, key: "" }]),
    );
    sessionStorage.setItem("gfc-key-" + profile.id, profile.key);
  }, profile);
  await page.goto("/");
  page.on("dialog", (d) => d.accept("Repair Clock"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  let requests = 0;
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      requests++;
      const body = route.request().postDataJSON();
      const payload = JSON.parse(body.messages[1].content);
      expect(body.max_tokens).toBe(2048);
      expect(payload.logs).not.toContain(profile.key);
      const file = payload.files[0];
      await route.fulfill({
        json: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  files: [
                    {
                      ...file,
                      content: file.content + "\n// repair " + requests,
                    },
                  ],
                }),
              },
            },
          ],
        },
      });
    },
  );
  await page.getByRole("button", { name: "修复", exact: true }).click();
  await page
    .getByLabel("修复相关日志")
    .fill("ERROR source/App.mc:2 Bearer " + profile.key);
  await page
    .getByRole("button", { name: "发送一次修复请求", exact: true })
    .click();
  await expect(page.getByLabel("修复后 source/App.mc")).toContainText(
    "// repair 1",
  );
  await page
    .getByRole("button", { name: "应用所审阅修复", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "发送一次修复请求", exact: true })
    .click();
  await expect(page.getByLabel("修复后 source/App.mc")).toContainText(
    "// repair 2",
  );
  await expect(
    page.getByRole("button", { name: "发送一次修复请求", exact: true }),
  ).toBeDisabled();
  expect(requests).toBe(2);
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await expect(page.locator(".history")).toContainText("已修补 1 次");
  await page.getByRole("button", { name: "修复", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "发送一次修复请求", exact: true }),
  ).toBeDisabled();
});

test("cancelled repair leaves applied code unchanged and still consumes a round", async ({
  page,
}) => {
  await page.addInitScript(
    (profile) =>
      localStorage.setItem(
        "gfc-profiles",
        JSON.stringify([{ ...profile, key: "" }]),
      ),
    profile,
  );
  await page.goto("/");
  page.on("dialog", (d) => d.accept("Cancel Repair"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.abort().catch(() => {});
    },
  );
  await page.getByRole("button", { name: "修复", exact: true }).click();
  await page
    .getByRole("button", { name: "发送一次修复请求", exact: true })
    .click();
  await page.getByRole("button", { name: "取消修复", exact: true }).click();
  await expect(page.locator(".repair-panel").getByRole("alert")).toContainText(
    "已取消",
  );
  await expect(page.locator(".repair-panel")).toContainText("本轮请求 1/2");
  await expect(
    page.getByRole("button", { name: "应用所审阅修复", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await expect(page.locator(".history")).toContainText("1/20");
  await expect(page.locator(".history")).not.toContainText("已修补");
});
