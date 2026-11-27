import { test, expect } from "@playwright/test";
import { generationDiagnostics } from "../src/generationDiagnostics";
import { layer, project } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
import { insertWidget } from "../src/widgets";

test("unselected configuration sources cannot bypass native style restrictions", () => {
  const p = project("Variants", true);
  const l = { ...layer("metric"), source: "steps", metricDecoration: true };
  p.layers = [l];
  p.controls = [
    {
      id: "source-choice",
      label: "读数",
      type: "dataSource",
      default: "steps",
      options: ["steps", "heartRate"],
      targets: [{ layerId: l.id, property: "source" }],
    },
  ];
  const before = JSON.stringify(p);
  expect(generationDiagnostics(p)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "LOCAL_CONFIGURATION_UNSUPPORTED",
        layerId: l.id,
        path: "controls/source-choice/options/heartRate",
      }),
    ]),
  );
  expect(() => localGenerate(p)).toThrow(/配置.*heartRate/);
  expect(JSON.stringify(p)).toBe(before);
  p.controls[0].options = ["steps", "battery"];
  expect(
    generationDiagnostics(p).filter((d) => d.status === "unsupported"),
  ).toEqual([]);
  expect(
    localGenerate(p).find((f) => f.path === "source/App.mc")!.content,
  ).toContain('equals("battery")');
});

test("private child diagnostics locate the single parent and excluded output is ignored", () => {
  const p = insertWidget(project("Compound", true), "capsule-metric");
  const owner = p.layers[0];
  const child = owner.compound!.layers.find((l) => l.kind === "metric")!;
  child.source = "altitude";
  const before = JSON.stringify(p);
  expect(generationDiagnostics(p)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "LOCAL_METRIC_SOURCE_UNSUPPORTED",
        layerId: owner.id,
      }),
    ]),
  );
  expect(JSON.stringify(p)).toBe(before);
  owner.exportIncluded = false;
  expect(
    generationDiagnostics(p).filter((d) => d.status === "unsupported"),
  ).toEqual([]);
});

test("target limits, effect instructions and approximations remain distinct", () => {
  const p = project("Checks", true);
  p.target = "venu3";
  p.layers = [
    layer("arcText"),
    { ...layer("ring"), ringStyle: "continuous", w: 200, h: 150 },
    { ...layer("text"), effectPrompt: "扫描动画" },
  ];
  const issues = generationDiagnostics(p);
  expect(
    issues.find((d) => d.code === "LOCAL_ARC_TEXT_TARGET_BUDGET")!.status,
  ).toBe("unsupported");
  expect(issues.find((d) => d.code === "LOCAL_EFFECT_PROMPT")!.status).toBe(
    "unsupported",
  );
  expect(
    issues.find((d) => d.code === "ELLIPTICAL_ARC_APPROXIMATION")!.status,
  ).toBe("approximation");
  expect(
    issues.find((d) => d.code === "SYSTEM_FONT_APPROXIMATION")!.status,
  ).toBe("approximation");
  expect(
    issues.find((d) => d.code === "DEVICE_VERIFICATION_PENDING")!.status,
  ).toBe("unverified");
});

test("inspector reports a blocked curved label and locates its editable object", async ({
  page,
}) => {
  page.on("dialog", d => d.accept("GenerationChecks"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "曲线文字", exact: true }).click();
  await page.getByLabel("曲线文字内容").fill("中文");
  const checks = page.locator("[data-generation-checks]");
  await checks.locator(":scope > summary").click();
  await expect(checks.locator(":scope > summary")).toContainText("1 项阻断");
  await expect(
    checks.locator('[data-diagnostic-status="unsupported"]'),
  ).toContainText("ASCII");
  await checks.locator('[data-diagnostic-status="unsupported"] button').click();
  await expect(page.getByLabel("曲线文字内容")).toHaveValue("中文");
  await page.getByLabel("曲线文字内容").fill("READY");
  await expect(checks.locator(":scope > summary")).toContainText("未发现映射阻断");
  await expect(
    checks.locator('[data-diagnostic-status="unverified"]'),
  ).toContainText("功耗");
});
