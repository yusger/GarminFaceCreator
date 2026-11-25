import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import { enableDevices, deviceKey, selectDevice } from "../src/multiDevice";
import {
  adaptationPayload,
  parseAdaptation,
  applyAdaptation,
  adaptationFingerprint,
} from "../src/adaptation";
import { requestAdaptation } from "../src/api";
const profile = {
  id: "mock",
  name: "Mock",
  url: "https://api.example.com/v1",
  key: "sk-private-sentinel-key",
  model: "mock-model",
  remember: false,
  tokens: 8192,
  temperature: 0.2,
};
function seed() {
  const p = project("Adapt", true);
  p.layers = [{ ...layer("time"), x: 100, y: 180, w: 250, h: 80, size: 50 }];
  return enableDevices(p);
}
test("adaptation payload exposes only current device design and no pixels source history credentials or other targets", () => {
  const p = seed();
  p.layers[0].text = profile.key;
  p.files = [{ path: "source/private.mc", content: "PRIVATE_SOURCE" }];
  p.layers[0].image = "PRIVATE_PIXELS";
  const payload = adaptationPayload(p, profile, "adjust " + profile.key),
    raw = JSON.stringify(payload);
  expect(raw).toContain("venu445mm");
  expect(raw).not.toContain(profile.key);
  expect(raw).not.toContain("PRIVATE_SOURCE");
  expect(raw).not.toContain("PRIVATE_PIXELS");
  expect(payload.designCoordinates.width).toBe(454);
});
test("strict adaptation patches preserve binding identity master design and invalidate only the resolved device code", () => {
  const p = seed(),
    id = p.layers[0].id,
    before = structuredClone(p.multiDevice!.master);
  const changes = parseAdaptation(
    p,
    JSON.stringify({
      changes: [{ id, patch: { x: 110, size: 48, color: "#ffffff" } }],
    }),
  );
  const next = applyAdaptation(p, changes);
  expect(next.multiDevice!.master).toEqual(before);
  expect(next.layers[0].x).toBe(110);
  expect(next.layers[0].source).toBe(p.layers[0].source);
  expect(next.appId).toBe(p.appId);
  expect(next.revision).toBe(1);
  expect(next.codeRevision).toBe(-1);
  expect(adaptationFingerprint(next)).not.toBe(adaptationFingerprint(p));
  expect(selectDevice(next, deviceKey(next), "master").layers[0].x).toBe(100);
  for (const patch of [
    { source: "battery" },
    { id: "new" },
    { image: "data" },
    { x: "20" },
    { size: 0 },
    { strokeWidth: 50 },
    { x: 10000 },
  ])
    expect(() =>
      parseAdaptation(p, JSON.stringify({ changes: [{ id, patch }] })),
    ).toThrow();
  expect(() =>
    parseAdaptation(
      p,
      JSON.stringify({ changes: [{ id: "missing", patch: { x: 1 } }] }),
    ),
  ).toThrow();
  const locked = seed();
  locked.multiDevice!.master[0].locked = true;
  expect(() =>
    parseAdaptation(
      locked,
      JSON.stringify({
        changes: [{ id: locked.layers[0].id, patch: { x: 1 } }],
      }),
    ),
  ).toThrow(/锁定/);
});
test("adaptation request honors model parameters and rejects truncated outputs without applying", async () => {
  const original = globalThis.fetch;
  let sent: any;
  globalThis.fetch = async (url, options) => {
    sent = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        choices: [
          { finish_reason: "length", message: { content: '{"changes":[]}' } },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    await expect(
      requestAdaptation(
        profile,
        { device: "test" },
        new AbortController().signal,
      ),
    ).rejects.toThrow(/截断/);
    expect(sent.model).toBe("mock-model");
    expect(JSON.stringify(sent)).not.toContain(profile.key);
  } finally {
    globalThis.fetch = original;
  }
});
test("AI adaptation previews a mocked layout patch, applies only after review and leaves the shared design intact", async ({
  page,
}) => {
  await page.addInitScript(
    (p) => localStorage.setItem("gfc-profiles", JSON.stringify([p])),
    profile,
  );
  page.on("dialog", (d) => d.accept("AdaptUI"));
  await page.goto("/");
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page.getByRole("button", { name: "适配设备", exact: true }).click();
  await page
    .getByRole("button", { name: "启用多设备适配", exact: true })
    .click();
  await page.getByRole("button", { name: /^适配设备/ }).click();
  let requests = 0;
  await page.route("https://api.example.com/v1/chat/completions", (route) => {
    requests++;
    const body = route.request().postDataJSON(),
      payload = JSON.parse(body.messages[1].content);
    return route.fulfill({
      json: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                changes: [
                  { id: payload.layers[0].id, patch: { color: "#ff0000" } },
                ],
              }),
            },
          },
        ],
      },
    });
  });
  await page.getByRole("button", { name: "AI 辅助适配", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "AI 辅助设备适配",
    exact: true,
  });
  expect(requests).toBe(0);
  await dialog
    .getByRole("button", { name: "请求适配建议", exact: true })
    .click();
  await expect(dialog.getByText("建议效果", { exact: true })).toBeVisible();
  await expect(dialog.locator(".adaptation-comparison .watch")).toHaveCount(2);
  await page.screenshot({ path: "docs/screenshots/ai-device-adaptation.png" });
  await dialog
    .getByRole("button", { name: "应用到当前设备", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(requests).toBe(1);
  await page.getByRole("button", { name: /^适配设备/ }).click();
  await expect(page.getByLabel("适配编辑范围", { exact: true })).toHaveValue(
    "device",
  );
  await expect(page.locator(".adaptation-panel")).toContainText("1 层微调");
  await page.getByLabel("适配编辑范围", { exact: true }).selectOption("master");
  await page.getByRole("button", { name: /^适配设备/ }).click();
  const svg = page.locator(".canvas-area svg.watch");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
});
