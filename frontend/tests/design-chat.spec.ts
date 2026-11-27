import {sourceContractVersion} from "../src/sourceAdapters";
import {capabilityVersion} from "../src/capabilities";
import {GENERATION_FIELD_CONTRACT_VERSION} from "../src/generationFields";
import { test, expect, type Page } from "@playwright/test";
import { project, layer, validateProject } from "../src/domain";
import { applyChat, chatPayload, chatFingerprint } from "../src/designChat";
import { insertWidget } from "../src/widgets";
import { editorFrame } from "../src/editorHistory";
function response(operations: unknown[]) {
  return JSON.stringify({ message: "已调整", operations });
}
test("chat contract applies atomic editable transactions and preserves source", () => {
  const p = project("Chat", true),
    clock = { ...layer("time"), x: 90, y: 170, w: 274, h: 80 };
  p.layers = [clock];
  const raw = response([
    { type: "update", id: clock.id, patch: { size: 70, color: "#66CCFF" } },
    { type: "background", color: "#102030" },
    {
      type: "add",
      kind: "metric",
      patch: {
        name: "电量",
        source: "battery",
        x: 150,
        y: 290,
        w: 154,
        h: 40,
        unit: "%",
        missingValue: "--",
        precision: 0,
      },
    },
  ]);
  const next = applyChat(p, raw).project;
  validateProject(next);
  expect(next.layers).toHaveLength(2);
  expect(next.layers[0].id).toBe(clock.id);
  expect(next.layers[0].size).toBe(70);
  expect(p.layers[0].size).not.toBe(70);
  expect(p.backgroundColor).not.toBe("#102030");
  expect(next.codeRevision).toBe(-1);
  expect(next.revision).toBe(p.revision + 1);
  expect(editorFrame(next).backgroundColor).toBe("#102030");
  expect(() =>
    applyChat(
      p,
      response([
        { type: "update", id: clock.id, patch: { size: 70 } },
        { type: "remove", id: "missing" },
      ]),
    ),
  ).toThrow();
  expect(p.layers[0]).toEqual(clock);
  for (const patch of [
    { compound: {} },
    { image: "https://bad" },
    { kind: "rect" },
    { size: "80" },
    { aod: "yes" },
    { x: -454 },
    { __proto__: null, constructor: "bad" },
  ])
    expect(() =>
      applyChat(p, response([{ type: "update", id: clock.id, patch }])),
    ).toThrow();
  expect(() =>
    applyChat(
      { ...p, layers: [{ ...clock, locked: true }] },
      response([{ type: "remove", id: clock.id }]),
    ),
  ).toThrow(/锁定/);
});
test("chat composites remain one object with independent parts and controlled colors", () => {
  const p = insertWidget(project("Compound", true), "capsule-metric"),
    root = p.layers[0],
    part = root.compound!.parts[0],
    control = root.compound!.controls.find((c) => c.type === "color")!;
  const result = applyChat(
    p,
    response([
      { type: "update", id: root.id, patch: { x: 110, w: 220, h: 100 } },
      { type: "part", id: root.id, partId: part.id, patch: { enabled: false } },
      { type: "control", widgetId: root.id, id: control.id, value: "#66CCFF" },
    ]),
  ).project;
  expect(result.layers).toHaveLength(1);
  expect(result.layers[0].kind).toBe("widget");
  expect(result.layers[0].compound!.layers).toHaveLength(5);
  expect(result.layers[0].compound!.parts[0].enabled).toBe(false);
  expect(p.layers[0].compound!.parts[0].enabled).toBe(true);
  expect(result.layers[0].compound!.controlValues![control.id]).toBe("#66CCFF");
  expect(() =>
    applyChat(
      p,
      response([{ type: "update", id: root.id, patch: { color: "#FFFFFF" } }]),
    ),
  ).toThrow();
  const inserted = applyChat(
    project("Add", true),
    response([{ type: "addWidget", widgetId: "segment-battery" }]),
  ).project;
  expect(inserted.layers).toHaveLength(1);
  expect(inserted.layers[0].compound!.layers).toHaveLength(6);
});
test("chat context excludes image pixels, source files, licenses and storage-only changes", () => {
  const p = insertWidget(project("Private", true), "capsule-metric");
  p.layers.push({
    ...layer("image"),
    image: "data:image/png;base64,PRIVATE",
    assetId: "private-asset",
  });
  p.files = [{ path: "source/Secret.mc", content: "PRIVATE_SOURCE" }];
  const context = JSON.stringify(chatPayload(p, []));
  expect(context).not.toContain("PRIVATE");
  expect(context).not.toContain("license");
  expect(context).not.toContain("compound");
  expect(chatPayload(p, []).device.screenWidth).toBe(454);
  expect(chatFingerprint({ ...p, storageVersion: 999, updated: 123 })).toBe(
    chatFingerprint(p),
  );
  expect(() =>
    applyChat(p, '{"message":"x","operations":[],"files":[]}'),
  ).toThrow();
  expect(applyChat(p, response([])).project).toEqual(p);
});
async function setup(page: Page, vision = false) {
  page.on("dialog", (d) => d.accept("Chat-UI"));
  await page.addInitScript((vision) => {
    localStorage.setItem(
      "gfc-profiles",
      JSON.stringify([
        {
          id: "chat-test",
          supportsImages: vision,
          name: "对话测试",
          url: "https://api.example.com/v1",
          model: "test-model",
          key: "",
          remember: false,
          temperature: 0.2,
          tokens: 8192,
        },
      ]),
    );
    sessionStorage.setItem("gfc-key-chat-test", "private-test-key");
  }, vision);
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "AI 设计助手", exact: true }).click();
}
async function send(page: Page, text: string) {
  await page.getByLabel("设计对话输入").fill(text);
  await page.getByRole("button", { name: "发送并调整", exact: true }).click();
}
async function exported(page: Page) {
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile((await (await wait).path())!, "utf8"));
}
test("chat browser applies multiple turns, undo/redo, folds and persists editable design", async ({
  page,
}) => {
  let count = 0;
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      count++;
      const body = route.request().postDataJSON();
      expect(route.request().headers().authorization).toBe(
        "Bearer private-test-key",
      );
      expect(JSON.stringify(body)).not.toContain("private-test-key");
      const context = JSON.parse(
        body.messages.at(-1).content.split("CURRENT_DESIGN_CONTEXT\n")[1],
      );
      expect(context.capabilities.catalogVersion).toBe(capabilityVersion);
      expect(context.capabilities.generationFieldContractVersion).toBe(GENERATION_FIELD_CONTRACT_VERSION);
      expect(context.capabilities.deterministic.rotation.supportedKinds).toEqual(["rect","line","circle","polygon"]);
      const operations =
        count === 1
          ? [
              {
                type: "add",
                kind: "time",
                patch: {
                  name: "AI时间",
                  x: 90,
                  y: 170,
                  w: 274,
                  h: 80,
                  size: 60,
                  aod: true,
                  aodColor: "#666666",
                },
              },
              { type: "background", color: "#102030" },
            ]
          : [
              {
                type: "update",
                id: context.layers[0].id,
                patch: { size: 72, color: "#66CCFF" },
              },
            ];
      if (count === 2)
        expect(body.messages.some((m: any) => m.role === "assistant")).toBe(
          true,
        );
      await route.fulfill({
        json: { choices: [{ message: { content: response(operations) } }] },
      });
    },
  );
  await setup(page);
  await send(page, "添加时间，背景改为深蓝");
  await expect(page.getByRole("log")).toContainText("添加：AI时间");
  await expect(page.locator(".layer-row")).toHaveCount(1);
  await send(page, "放大时间并改成冰蓝");
  await expect(page.getByRole("log")).toContainText("调整：AI时间");
  await page.screenshot({ path: "test-results/design-chat.png" });
  expect((await exported(page)).layers[0].size).toBe(72);
  await page.getByRole("button", { name: "撤销上次编辑", exact: true }).click();
  expect((await exported(page)).layers[0].size).toBe(60);
  await page.getByTitle("重做", { exact: true }).click();
  expect((await exported(page)).layers[0].size).toBe(72);
  await page.getByRole("button", { name: "撤销上次编辑", exact: true }).click();
  await page.getByRole("button", { name: "撤销上次编辑", exact: true }).click();
  expect((await exported(page)).layers).toHaveLength(0);
  expect((await exported(page)).backgroundColor).not.toBe("#102030");
  await page.getByTitle("重做", { exact: true }).click();
  await page.getByLabel("收起设计助手").click();
  await page.getByRole("button", { name: "AI 设计助手", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("放大时间");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "打开 Chat-UI", exact: true }).click();
  expect((await exported(page)).layers).toHaveLength(1);
  const snapshots = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gfc-ai-request-history-v1") || "[]"),
  );
  expect(snapshots).toHaveLength(2);
  expect(
    snapshots.every(
      (s: any) =>
        s.kind === "chat" &&
        s.status === "response" &&
        s.promptVersion === "chat-16-moon" &&
        s.profileId === "chat-test" && s.sourceContractVersion === sourceContractVersion &&
        s.context?.version === "request-context-1" && s.context.target === "venu445mm" && s.context.inputFingerprint.startsWith("local-v1:"),
    ),
  ).toBe(true);
  expect(JSON.stringify(snapshots)).not.toContain("private-test-key");
  expect(count).toBe(2);
});
test("chat browser rejects stale, malformed and cancelled replies without partial writes", async ({
  page,
}) => {
  let mode = "stale",
    release: () => void = () => {};
  await page.route(
    "https://api.example.com/v1/chat/completions",
    async (route) => {
      if (mode !== "invalid")
        await new Promise<void>((r) => {
          release = r;
        });
      await route
        .fulfill({
          json: {
            choices: [
              {
                message: {
                  content:
                    mode === "invalid"
                      ? response([
                          { type: "background", color: "#AABBCC" },
                          { type: "add", kind: "script", patch: {} },
                        ])
                      : response([{ type: "background", color: "#AABBCC" }]),
                },
              },
            ],
          },
        })
        .catch(() => {});
    },
  );
  await setup(page);
  await send(page, "修改背景");
  await expect(page.getByRole("status")).toContainText("正在调整");
  await page.getByRole("button", { name: "时间", exact: true }).click();
  release();
  await expect(page.getByRole("alert")).toContainText("设计已变化");
  expect((await exported(page)).backgroundColor).not.toBe("#AABBCC");
  mode = "invalid";
  await send(page, "错误包");
  await expect(page.getByRole("alert")).toContainText("不支持添加");
  expect((await exported(page)).backgroundColor).not.toBe("#AABBCC");
  mode = "cancel";
  await send(page, "取消这次");
  await page.getByRole("button", { name: "取消请求", exact: true }).click();
  release();
  await expect(page.getByRole("alert")).toContainText("已取消");
  expect((await exported(page)).backgroundColor).not.toBe("#AABBCC");
});

for (const vision of [false, true])
  test(`visual chat requires explicit image capability ${vision}`, async ({
    page,
  }) => {
    let calls = 0;
    await page.route(
      "https://api.example.com/v1/chat/completions",
      async (route) => {
        calls++;
        const body = route.request().postDataJSON(),
          content = body.messages.at(-1).content;
        expect(Array.isArray(content)).toBe(true);
        const images = content.filter((v: any) => v.type === "image_url");
        expect(images).toHaveLength(3);
        for (const image of images) {
          const b = Buffer.from(image.image_url.url.split(",")[1], "base64");
          expect(b.subarray(1, 4).toString()).toBe("PNG");
        }
        expect(content.some((v: any) => v.text?.includes('"width":454'))).toBe(
          true,
        );
        expect(content.some((v: any) => v.text?.includes("仅设计参考"))).toBe(
          true,
        );
        await route.fulfill({
          json: { choices: [{ message: { content: response([]) } }] },
        });
      },
    );
    await setup(page, vision);
    await page.getByLabel("发送当前亮屏截图", { exact: true }).check();
    await page.getByLabel("发送当前AOD截图", { exact: true }).check();
    await page
      .getByLabel("对话参考图片")
      .setInputFiles({
        name: "reference.png",
        mimeType: "image/png",
        buffer: Buffer.from(await page.evaluate(()=>{const c=document.createElement("canvas");c.width=4;c.height=4;return c.toDataURL("image/png").split(",")[1];}),"base64"),
      });
    await expect(
      page.locator(".chat-visual-options"),
    ).toContainText("reference.png");
    await send(page, "按参考图调整");
    if (vision) {
      await expect(page.getByRole("log")).toContainText("已调整");
      expect(calls).toBe(1);
      const records = await page.evaluate(() =>
        localStorage.getItem("gfc-ai-request-history-v1"),
      );
      expect(records).toContain("IMAGE OMITTED");
      expect(records).not.toContain("data:image");
      expect(records).not.toContain("private-test-key");
    } else {
      await expect(page.getByRole("alert")).toContainText("未确认支持图片");
      expect(calls).toBe(0);
      await expect(page.getByLabel("设计对话输入")).toHaveValue("按参考图调整");
    }
    await expect(
      page.locator(".chat-visual-options"),
    ).toContainText("reference.png");
  });
