import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import {
  checkNativeState,
  nativeArtifactPath,
  nativeActive,
} from "../src/nativeVerification";
const id = "e".repeat(32),
  token = "f".repeat(64),
  root = `/api/builds/${id}/native-verification`;
const success = (attempt = 1) => ({
  buildId: id,
  status: "succeeded",
  attempt,
  target: "venu445mm",
  revision: 1,
  generatorVersion: "basic-test",
  prgSha256: "a".repeat(64),
  sourceSha256: "b".repeat(64),
  canRetry: false,
  artifacts: [
    { id: "screen.png", url: root + "/artifacts/screen.png" },
    { id: "metadata.json", url: root + "/artifacts/metadata.json" },
  ],
  report: {
    width: 454,
    height: 454,
    applicationMode: "active",
    sdkVersion: "9.3.0",
    capturedAtUtc: "2026-11-27T01:00:00Z",
    logs: "GFC_RENDER_READY",
    maxSampledMemoryBytes: 140 * 1048576,
    samples: 8,
    cleanupStatus: "completed",
    hardware: "unverified",
    sleepTransition: "unverified",
  },
});
test("native state cannot confuse compile success with verified capture or cross-task artifacts", () => {
  expect(() =>
    checkNativeState(
      {
        buildId: id,
        status: "succeeded",
        artifacts: [{ id: "watchface.prg", url: "/api/prg" }],
      },
      id,
    ),
  ).toThrow(/有效依据/);
  expect(checkNativeState(success(), id).status).toBe("succeeded");
  expect(() => checkNativeState(success(), "a".repeat(32))).toThrow(/状态/);
  expect(() => checkNativeState({ ...success(), status: "fake" }, id)).toThrow(
    /状态/,
  );
  for (const url of [
    "https://external.invalid/image.png",
    root + "/artifacts/screen.png?token=hidden",
    root.replace(id, "b".repeat(32)) + "/artifacts/screen.png",
  ]) {
    const data = success();
    data.artifacts[0].url = url;
    expect(() => nativeArtifactPath(data, "screen.png")).toThrow(/不匹配/);
  }
  expect(nativeActive("queued")).toBe(true);
  expect(nativeActive("succeeded")).toBe(false);
});
async function createAndCompile(page: any) {
  page.on("dialog", (d: any) => d.accept("NativeUI"));
  await page.goto("/");
  await page.getByRole("button", { name: /^空白画布/ }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "编译", exact: true }).first().click();
}
async function mock(page: any, cancel = false) {
  let started = 0,
    checks = 0,
    cancelling = false;
  const authenticated: string[] = [];
  const png = await readFile(
    "resources/examples/reference-release-v2/preview.png",
  );
  await page.route("**/api/capabilities", (r: any) =>
    r.fulfill({
      json: {
        devices: [{ target: "venu445mm", ready: true, reasons: [] }],
        nativeVerification: { enabled: true, ready: true },
      },
    }),
  );
  await page.route("**/api/builds", (r: any) =>
    r.fulfill({ status: 202, json: { buildId: id, accessToken: token } }),
  );
  await page.route(`**/api/builds/${id}`, (r: any) =>
    r.fulfill({
      json: {
        status: "succeeded",
        artifacts: [
          {
            id: "watchface.prg",
            url: `/api/builds/${id}/artifacts/watchface.prg`,
          },
        ],
      },
    }),
  );
  await page.route(`**/api/builds/${id}/logs?*`, (r: any) =>
    r.fulfill({ json: { lines: ["SDK 编译成功"], nextCursor: 1 } }),
  );
  await page.route(`**${root}**`, async (r: any) => {
    authenticated.push(r.request().headers().authorization || "");
    const path = new URL(r.request().url()).pathname;
    if (path.endsWith("/screen.png"))
      return r.fulfill({ contentType: "image/png", body: png });
    if (path.endsWith("/metadata.json"))
      return r.fulfill({ json: success(started) });
    if (path.endsWith("/cancel")) {
      cancelling = true;
      return r.fulfill({
        json: { buildId: id, status: "cancelling", attempt: started },
      });
    }
    if (r.request().method() === "POST") {
      started++;
      checks = 0;
      return r.fulfill({
        status: 202,
        json: { buildId: id, status: "queued", attempt: started },
      });
    }
    if (!started)
      return r.fulfill({ json: { buildId: id, status: "not_requested" } });
    if (cancelling)
      return r.fulfill({
        json: {
          buildId: id,
          status: "cancelled",
          attempt: started,
          error: "cancelled",
          canRetry: true,
          artifacts: [],
        },
      });
    if (cancel || checks++ < 1)
      return r.fulfill({
        json: { buildId: id, status: "running", attempt: started },
      });
    return r.fulfill({ json: success(started) });
  });
  return { starts: () => started, headers: authenticated };
}
test("native UI is explicit, uses protected downloads and separates simulation from hardware", async ({
  page,
}) => {
  const observed = await mock(page);
  await createAndCompile(page);
  const panel = page.locator("[data-native-verification]");
  await expect(
    panel.getByRole("button", { name: "运行 SDK 模拟器", exact: true }),
  ).toBeEnabled();
  expect(observed.starts()).toBe(0);
  await panel
    .getByRole("button", { name: "运行 SDK 模拟器", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("截图已取得", {
    timeout: 15000,
  });
  const img = panel.getByAltText("SDK 模拟器原生盘面截图");
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((e: any) => e.naturalWidth)).toBe(454);
  await expect(panel.getByRole("region",{name:"息屏像素分析"})).toContainText("当前帧不是已确认的AOD");
  const pixelWait=page.waitForEvent("download");await panel.getByRole("button",{name:"下载像素统计",exact:true}).click();const pixelData=JSON.parse(await readFile((await(await pixelWait).path())!,"utf8"));expect(pixelData).toMatchObject({buildId:id,origin:"native-frame",mode:"active",referenceStatus:"not-aod",prgSha256:"a".repeat(64),sourceSha256:"b".repeat(64)});
  const popupWait = page.waitForEvent("popup");
  await panel.getByRole("link", { name: "查看完整截图", exact: true }).click();
  const popup = await popupWait;
  await expect.poll(() => popup.url()).toContain("blob:");
  expect(popup.url()).not.toContain(token);
  await popup.close();
  await expect(panel).toContainText("真实手表的显示");
  await expect(panel).toContainText("独立动态数据");
  const wait = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "下载原生截图", exact: true })
    .click();
  const data = await readFile(await (await wait).path());
  expect(data.readUInt32BE(16)).toBe(454);
  expect(observed.starts()).toBe(1);
  expect(observed.headers.every((h) => h === "Bearer " + token)).toBe(true);
});
test("native cancellation remains separate from compile output", async ({
  page,
}) => {
  const observed = await mock(page, true);
  await createAndCompile(page);
  const panel = page.locator("[data-native-verification]");
  await panel
    .getByRole("button", { name: "运行 SDK 模拟器", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "取消原生验证", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("已取消");
  await expect(
    panel.getByRole("button", { name: "重试原生验证", exact: true }),
  ).toBeEnabled();
  await expect(
    page.locator(".build-drawer").getByText("SDK 编译成功", { exact: false }),
  ).toBeVisible();
  await expect(panel.getByAltText("SDK 模拟器原生盘面截图")).toHaveCount(0);
  expect(observed.starts()).toBe(1);
});
test("actual 113 browser compiles, verifies and decodes native screenshot", async ({
  page,
}) => {
  test.skip(
    process.env.GFC_TEST_SDK !== "1" || process.env.GFC_NATIVE_TEST !== "1",
    "Explicit SDK and native test",
  );
  test.setTimeout(240000);
  await createAndCompile(page);
  const panel = page.locator("[data-native-verification]");
  await expect(
    panel.getByRole("button", { name: "运行 SDK 模拟器", exact: true }),
  ).toBeEnabled({ timeout: 130000 });
  await panel
    .getByRole("button", { name: "运行 SDK 模拟器", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("截图已取得", {
    timeout: 180000,
  });
  const img = panel.getByAltText("SDK 模拟器原生盘面截图");
  await expect
    .poll(() => img.evaluate((e: any) => e.complete && e.naturalWidth), {
      timeout: 10000,
    })
    .toBe(454);
  await mkdir("Temp/native-ui-validation", { recursive: true });
  const wait = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "下载验证元数据", exact: true })
    .click();
  const meta = JSON.parse(await readFile(await (await wait).path(), "utf8"));
  expect(meta.report.cleanupStatus).toBe("completed");
  expect(meta.report.hardware).toBe("unverified");
  await page.screenshot({ path: "Temp/native-ui-validation/panel.png" });
});
