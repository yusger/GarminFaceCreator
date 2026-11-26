import { test, expect, type Page } from "@playwright/test";
import {
  parseDesign,
  designPayload,
  type DesignChoices,
  type DesignReference,
} from "../src/aiDesign";
import { validateProject, type Project } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { generationHeader, generationLayer } from "../src/generationDto";
import {
  saveDesignSnapshot,
  restoreDesignSnapshot,
} from "../src/designHistory";
import { readFile } from "node:fs/promises";
const tiny =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";
const choices: DesignChoices = {
  name: "AIDesign",
  target: "venu445mm",
  deviceSize: "45mm",
  style: "DIGITAL",
  seconds: false,
  date: true,
  dateLocale: "en",
  sources: ["heartRate", "steps", "battery"],
  instruction: "Use teal, retain editable layers.",
};
function response(
  c: DesignChoices,
  refs: { id: string; usage: string }[] = [],
) {
  const common = {
    color: "#dce9f0",
    size: 26,
    aod: false,
    aodColor: "#50606d",
  };
  const layers: any[] = [];
  if (c.style !== "ANALOG")
    layers.push({
      ...common,
      id: "time",
      name: "主时间",
      kind: "time",
      x: 90,
      y: 175,
      w: 274,
      h: 80,
      size: 64,
      timePart: "full",
      aod: true,
    });
  if (c.style !== "DIGITAL")
    for (const part of ["hour", "minute"])
      layers.push({
        ...common,
        id: "hand_" + part,
        name: part + "Hand",
        kind: "hand",
        x: 72,
        y: 72,
        w: 310,
        h: 310,
        handType: part,
        handPivotX: 0.5,
        handPivotY: 0.5,
        handReach: part === "hour" ? 0.5 : 0.8,
        handTail: 0.06,
        strokeWidth: 4,
        aod: true,
      });
  if (c.seconds)
    layers.push({
      ...common,
      id: "seconds",
      name: "数字秒",
      kind: "time",
      x: 195,
      y: 265,
      w: 64,
      h: 28,
      timePart: "seconds",
    });
  if (c.date)
    layers.push({
      ...common,
      id: "date",
      name: "日期",
      kind: "date",
      x: 142,
      y: 125,
      w: 170,
      h: 26,
      size: 18,
      dateLocale: c.dateLocale,
    });
  c.sources.forEach((source, i) =>
    layers.push({
      ...common,
      id: "metric_" + i,
      name: "Data_" + source,
      kind: "metric",
      source,
      x: 72 + i * 106,
      y: 310,
      w: 90,
      h: 36,
      size: 26,
      label: "",
      precision: source === "distance" ? 2 : 0,
      missingValue: "--",
    }),
  );
  const asset = refs.find((r) => r.usage === "asset");
  if (asset)
    layers.unshift({
      ...common,
      id: "back",
      name: "素材装饰",
      kind: "image",
      referenceId: asset.id,
      x: 170,
      y: 70,
      w: 80,
      h: 35,
    });
  return { backgroundColor: "#0b1b2b", layers };
}

test("AI design parser creates fresh editable identities and carries requirements through import, history and generation", () => {
  const a = parseDesign(JSON.stringify(response(choices)), choices, []);
  const b = parseDesign(JSON.stringify(response(choices)), choices, []);
  expect(a.id).not.toBe(b.id);
  expect(a.appId).not.toBe(b.appId);
  expect(a.files).toEqual([]);
  expect(a.codeRevision).toBe(-1);
  expect(a.versions).toEqual([]);
  expect(a.schemaVersion).toBe(23);
  a.layers[0].effectPrompt = "Draw extra native markers; static in AOD.";
  const snapshot = saveDesignSnapshot(a, "AI design");
  const restored = restoreDesignSnapshot(
    { ...snapshot, designBrief: "changed", layers: [] },
    snapshot.designSnapshots![0].id,
  );
  expect(restored.designBrief).toBe(a.designBrief);
  expect(restored.layers[0].effectPrompt).toBe(a.layers[0].effectPrompt);
  const imported = validateProject(restored);
  expect(imported.designBrief).toBe(a.designBrief);
  expect(generationHeader(imported).designBrief).toBe(a.designBrief);
  expect(generationLayer(imported.layers[0]).effectPrompt).toBe(
    a.layers[0].effectPrompt,
  );
  expect(() => localGenerate(imported)).toThrow("原生效果说明");
  imported.layers[0].effectPrompt = "";
  expect(localGenerate(imported).length).toBeGreaterThan(2);
});

test("AI design protocol rejects native files, unknown fields, malformed bindings, time mismatch, clipping and invalid AOD", () => {
  const good = response(choices);
  const check = (mutate: (x: any) => void) => {
    const x = structuredClone(good);
    mutate(x);
    expect(() => parseDesign(JSON.stringify(x), choices, [])).toThrow();
  };
  check((x) => (x.files = []));
  check((x) => (x.layers[0].image = "https://invalid.example/file.png"));
  check((x) => (x.layers[0].kind = "script"));
  check((x) => (x.layers[1].id = x.layers[0].id));
  check((x) => (x.layers[0].x = -100));
  check((x) => (x.layers[0].aod = false));
  check(
    (x) =>
      (x.layers.find((l: any) => l.kind === "metric").source =
        "notificationCount"),
  );
  check(
    (x) => (x.layers = x.layers.filter((l: any) => l.source !== "battery")),
  );
  check((x) => (x.layers[0].timePart = "seconds"));
  check((x) => (x.layers[0].effectPrompt = 42));
  check((x) => (x.layers[0].w = 1e100));
  check(
    (x) => (x.layers[0].thresholdRules = [{ color: "#fff000", script: "bad" }]),
  );
  expect(() =>
    parseDesign(JSON.stringify(good), { ...choices, style: "HYBRID" }, []),
  ).toThrow();
  expect(() =>
    parseDesign("prose " + JSON.stringify(good), choices, []),
  ).toThrow();
  const withSeconds = { ...choices, seconds: true };
  const secondsDesign = response(withSeconds);
  secondsDesign.layers.find((l) => l.id === "seconds").aod = true;
  expect(() =>
    parseDesign(JSON.stringify(secondsDesign), withSeconds, []),
  ).toThrow("AOD");
  expect(() =>
    parseDesign(JSON.stringify(good), { ...choices, target: "unknown" }, []),
  ).toThrow();
});

test("only explicit material references become runtime assets; style references and metadata never become hidden code", () => {
  const refs: DesignReference[] = [
    { id: "ref_a", name: "reference.png", usage: "asset", data: tiny },
  ];
  const body = response(choices, refs);
  const payload = designPayload(choices, refs);
  expect(JSON.stringify(payload)).not.toContain("base64");
  const units = {
    ...choices,
    sources: ["altitude", "distance", "temperature", "windSpeed"],
  };
  expect(designPayload(units, []).dataSources.map((s) => s.unit)).toEqual([
    "ft",
    "km",
    "°C",
    "m/s",
  ]);
  const altitude = { ...choices, sources: ["altitude"] };
  const badUnit = response(altitude);
  badUnit.layers.find((l) => l.kind === "metric").unit = "m";
  expect(() => parseDesign(JSON.stringify(badUnit), altitude, [])).toThrow(
    "数据单位",
  );

  const p = parseDesign(JSON.stringify(body), choices, refs);
  expect(p.layers[0].image).toBe(tiny);
  expect(p.layers[0].imageFullColor).toBe(true);
  expect(() =>
    parseDesign(JSON.stringify(body), choices, [
      { ...refs[0], usage: "style" },
    ]),
  ).toThrow("实际素材");
  const zh = { ...choices, dateLocale: "zh" as const };
  const zhBody = response(zh);
  expect(
    parseDesign(JSON.stringify(zhBody), zh, []).layers.some(
      (l) => l.kind === "date" && l.dateLocale === "zh",
    ),
  ).toBe(true);
  zhBody.layers.find((l) => l.kind === "date").dateFormat = "monthDayWeek";
  expect(() => parseDesign(JSON.stringify(zhBody), zh, [])).toThrow("日期格式");
  for (const style of ["DIGITAL", "ANALOG", "HYBRID"] as const) {
    const c = { ...choices, style, sources: [], date: false };
    expect(
      parseDesign(JSON.stringify(response(c)), c, []).layers.length,
    ).toBeGreaterThan(0);
  }
});

async function setup(page: Page) {
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(() => {
    if (!localStorage.getItem("gfc-profiles"))
      localStorage.setItem(
        "gfc-profiles",
        JSON.stringify([
          {
            id: "ai-design-test",
            name: "设计测试模型",
            url: "https://api.example.com/v1",
            model: "test-vision-model",
            key: "",
            remember: false,
            temperature: 0.2,
            tokens: 8192,
          },
        ]),
      );
    sessionStorage.setItem("gfc-key-ai-design-test", "test-private-key");
  });
  await page.goto("/");
  await page.getByRole("button", { name: "AI 创建表盘", exact: false }).click();
}
async function next(page: Page) {
  await page.getByRole("button", { name: "下一步", exact: true }).click();
}
function decode(body: any) {
  const content = body.messages[1].content;
  return JSON.parse(typeof content === "string" ? content : content[0].text);
}

for (const size of ["45mm", "41mm"])
  test(
    "AI design " +
      size +
      " saves without code or builds, allows manual edit, then explicitly generates and compiles",
    async ({ page }) => {
      test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
      test.setTimeout(180000);
      let calls = 0,
        builds = 0;
      page.on("request", (r) => {
        if (r.method() === "POST" && r.url().endsWith("/api/builds")) builds++;
      });
      await page.route(
        "https://api.example.com/v1/chat/completions",
        async (r) => {
          calls++;
          const body = r.request().postDataJSON(),
            p = decode(body);
          expect(r.request().headers().authorization).toBe(
            "Bearer test-private-key",
          );
          expect(JSON.stringify(body)).not.toContain("test-private-key");
          expect(p.device.screenWidth).toBe(size === "41mm" ? 390 : 454);
          expect(p.device.size).toBe(size);
          expect(p.contract.noNativeFiles).toBe(true);
          await r.fulfill({
            json: {
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    content: JSON.stringify(response(p.choices, p.references)),
                  },
                },
              ],
            },
          });
        },
      );
      await setup(page);
      await page.getByLabel("AI项目名称").fill("AI" + size);
      await page.getByLabel("AI手表尺寸").selectOption(size);
      if (size === "41mm")
        await page.screenshot({
          path: "docs/screenshots/ai-create-device.png",
          fullPage: true,
        });
      await next(page);
      if (size === "41mm") {
        await page.getByLabel("时间风格").selectOption("HYBRID");
        await page.getByLabel("显示秒数", { exact: true }).check();
        await page.screenshot({
          path: "docs/screenshots/ai-create-options.png",
          fullPage: true,
        });
      }
      await next(page);
      await page
        .getByRole("button", { name: "生成表盘项目", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "采用设计并编辑", exact: true }),
      ).toBeVisible();
      expect(calls).toBe(1);
      expect(builds).toBe(0);
      await page.screenshot({
        path: "docs/screenshots/ai-create-" + size + ".png",
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "采用设计并编辑", exact: true })
        .click();
      await expect(
        page.getByText("已保存到本机", { exact: true }),
      ).toBeVisible();
      await page.getByText("主时间", { exact: true }).first().click();
      await page.getByLabel("字号", { exact: true }).fill("62");
      await expect(
        page.getByText("已保存到本机", { exact: true }),
      ).toBeVisible();
      expect(calls).toBe(1);
      expect(builds).toBe(0);
      await page.reload();
      await page
        .getByRole("button", { name: "打开 AI" + size, exact: true })
        .click();
      await page.getByText("主时间", { exact: true }).first().click();
      await expect(page.getByLabel("字号", { exact: true })).toHaveValue("62");
      const exported = page.waitForEvent("download");
      await page.getByRole("button", { name: "导出项目", exact: true }).click();
      const disk = JSON.parse(
        await readFile((await (await exported).path())!, "utf8"),
      );
      expect(disk.files).toEqual([]);
      expect(disk.codeRevision).toBe(-1);
      expect(JSON.parse(disk.designBrief).style).toBe(
        size === "45mm" ? "DIGITAL" : "HYBRID",
      );
      expect(JSON.stringify(disk)).not.toContain("test-private-key");
      await page
        .getByRole("button", { name: "本地生成（试验）", exact: true })
        .click();
      await page
        .getByRole("button", { name: "应用生成结果", exact: true })
        .click();
      await page
        .getByRole("button", { name: "编译", exact: true })
        .first()
        .click();
      await expect(page.locator(".build-drawer pre")).toContainText(
        "BUILD SUCCESSFUL",
        { timeout: 120000 },
      );
      expect(calls).toBe(1);
      expect(builds).toBe(1);
    },
  );

test("reference image is sent directly to the model; native effects reach engineering only on explicit request", async ({
  page,
}) => {
  test.setTimeout(150000);
  let calls = 0,
    engineering: any;
  await page.route("https://api.example.com/v1/chat/completions", async (r) => {
    calls++;
    const body = r.request().postDataJSON();
    if (calls === 1) {
      const p = decode(body);
      expect(
        body.messages[1].content.some(
          (c: any) =>
            c.type === "image_url" &&
            c.image_url.url.startsWith("data:image/png;base64,"),
        ),
      ).toBe(true);
      expect(p.references[0].usage).toBe("asset");
      const design = response(p.choices, p.references);
      design.layers.find((l) => l.kind === "metric").effectPrompt =
        "Draw extra native scale markers; AOD static.";
      await r.fulfill({
        json: { choices: [{ message: { content: JSON.stringify(design) } }] },
      });
    } else {
      engineering = decode(body);
      await r.fulfill({
        json: {
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
                      path: "source/App.mc",
                      content: "// mock native engineering",
                    },
                  ],
                }),
              },
            },
          ],
        },
      });
    }
  });
  await setup(page);
  await next(page);
  await next(page);
  await page.locator('.ai-design-form input[type="file"]').setInputFiles({
    name: "material.png",
    mimeType: "image/png",
    buffer: await readFile(
      "resources/default-watchfaces/sonar/assets/sonar_heart_icon.png",
    ),
  });
  await page.getByLabel("参考图用途 material.png").selectOption("asset");
  await page.getByRole("button", { name: "生成表盘项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "采用设计并编辑", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "采用设计并编辑", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByText("Data_heartRate", { exact: true }).first().click();
  await expect(page.getByLabel("原生效果说明")).toHaveValue(
    "Draw extra native scale markers; AOD static.",
  );
  await page
    .getByLabel("原生效果说明")
    .fill("Use the CURRENT edited effect; AOD static.");
  await page.getByLabel("字号", { exact: true }).fill("29");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await expect(page.getByText(/设计含原生效果说明/).first()).toBeVisible();
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "AI 生成代码", exact: true }).click();
  await page.getByRole("button", { name: "生成完整工程", exact: true }).click();
  await expect(page.getByText("3 个文件待审阅")).toBeVisible();
  expect(calls).toBe(2);
  const hr = engineering.design.layers.find(
    (l: any) => l.source === "heartRate" && l.kind === "metric",
  );
  expect(hr.size).toBe(29);
  expect(hr.effectPrompt).toContain("CURRENT edited");
  expect(engineering.design.assets.length).toBeGreaterThan(0);
  expect(engineering.design.designBrief).toContain("style");
  if (process.env.GFC_TEST_URL) {
    await page.getByLabel("原生效果说明").fill("");
    await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "本地生成（试验）", exact: true })
      .click();
    await page
      .getByRole("button", { name: "应用生成结果", exact: true })
      .click();
    await page
      .getByRole("button", { name: "编译", exact: true })
      .first()
      .click();
    await expect(page.locator(".build-drawer pre")).toContainText(
      "BUILD SUCCESSFUL",
      { timeout: 120000 },
    );
    expect(calls).toBe(2);
  }
});

test("invalid or truncated designs do not save a project; cancellation ignores late responses and retry preserves inputs", async ({
  page,
}) => {
  let mode = "invalid",
    calls = 0;
  await page.route("https://api.example.com/v1/chat/completions", async (r) => {
    calls++;
    const p = decode(r.request().postDataJSON());
    if (mode === "wait") {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        await r.fulfill({
          json: {
            choices: [
              { message: { content: JSON.stringify(response(p.choices)) } },
            ],
          },
        });
      } catch {}
      return;
    }
    await r.fulfill({
      json: {
        choices: [
          {
            finish_reason: mode === "truncated" ? "length" : "stop",
            message: {
              content:
                mode === "invalid"
                  ? '{"files":[]}'
                  : JSON.stringify(response(p.choices)),
            },
          },
        ],
      },
    });
  });
  await setup(page);
  await next(page);
  await next(page);
  const generate = page.getByRole("button", {
    name: "生成表盘项目",
    exact: true,
  });
  await generate.click();
  await expect(page.getByRole("alert")).toContainText("独立layers");
  await expect(
    page.getByRole("button", { name: "采用设计并编辑", exact: true }),
  ).toHaveCount(0);
  await page.getByText("模型响应", { exact: true }).click();
  const rawDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载模型响应", exact: true }).click();
  expect(await readFile((await (await rawDownload).path())!, "utf8")).toBe(
    '{"files":[]}',
  );
  mode = "truncated";
  await generate.click();
  await expect(page.getByRole("alert")).toContainText("截断");
  mode = "wait";
  await generate.click();
  await page.getByRole("button", { name: "取消设计生成", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("已取消");
  await page.waitForTimeout(1300);
  await expect(
    page.getByRole("button", { name: "采用设计并编辑", exact: true }),
  ).toHaveCount(0);
  mode = "valid";
  await generate.click();
  await expect(
    page.getByRole("button", { name: "采用设计并编辑", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(4);
  await expect(page.getByLabel("设计提示词")).toContainText("简洁清晰");
});

test("failed browser save retains the valid AI design and allows backup and retry without another model request", async ({
  page,
}) => {
  let calls = 0;
  await page.route("https://api.example.com/v1/chat/completions", async (r) => {
    calls++;
    const p = decode(r.request().postDataJSON());
    await r.fulfill({
      json: {
        choices: [
          { message: { content: JSON.stringify(response(p.choices)) } },
        ],
      },
    });
  });
  await setup(page);
  await next(page);
  await next(page);
  await page.getByRole("button", { name: "生成表盘项目", exact: true }).click();
  const adopt = page.getByRole("button", {
    name: "采用设计并编辑",
    exact: true,
  });
  await expect(adopt).toBeVisible();
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    let fail = true;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if (args[1] === "readwrite" && fail) {
        fail = false;
        throw new DOMException("test full", "QuotaExceededError");
      }
      return (original as any).apply(this, args);
    } as typeof original;
  });
  await adopt.click();
  await expect(page.getByRole("alert")).toContainText("有效设计仍保留");
  await expect(adopt).toBeVisible();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载设计备份", exact: true }).click();
  const disk = JSON.parse(
    await readFile((await (await exported).path())!, "utf8"),
  );
  expect(disk.files).toEqual([]);
  expect(disk.layers.length).toBeGreaterThan(0);
  await adopt.click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
});
