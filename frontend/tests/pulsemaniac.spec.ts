import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
function unzip(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      n = bytes.readUInt16LE(offset + 26),
      e = bytes.readUInt16LE(offset + 28),
      start = offset + 30 + n + e;
    files.set(
      bytes.subarray(offset + 30, offset + 30 + n).toString(),
      bytes.subarray(start, start + size),
    );
    offset = start + size;
  }
  return files;
}
test("owned PulseManiac package pins all selected transparent assets and leaves upstream reference registry independent", async ({
  request,
}) => {
  const bundle = await (await request.get("/pulsemaniac/project.json")).json();
  expect(bundle.project.starterId).toBe("pulsemaniac");
  expect(bundle.project.layers).toHaveLength(21);
  expect(bundle.images).toHaveLength(5);
  for (const asset of bundle.images) {
    const r = await request.get(asset.path);
    expect(r.ok()).toBe(true);
    expect(
      createHash("sha256")
        .update(await r.body())
        .digest("hex"),
    ).toBe(asset.sha256);
  }
  const states = bundle.project.layers.filter(
    (l: any) => l.kind === "image" && l.visibility,
  );
  expect(states).toHaveLength(4);
  expect(states.every((l: any) => l.x === 117 && l.y === 104)).toBe(true);
  expect(
    bundle.project.layers
      .filter((l: any) => l.kind === "metric" && l.source === "heartRate")
      .every((l: any) => l.x === 217 && l.y === 200 && l.label === ""),
  ).toBe(true);
  expect(
    bundle.project.layers.filter((l: any) => l.kind === "time"),
  ).toHaveLength(1);
  expect(
    bundle.project.layers.filter((l: any) => l.kind === "date"),
  ).toHaveLength(1);
  expect(
    (await (await request.get("/reference-notices/provenance.json")).json())
      .bundles,
  ).toHaveLength(10);
});
test("PulseManiac creates an editable native project, previews all four static states and AOD, exports notices and compiles after data and device changes", async ({
  page,
}) => {
  test.setTimeout(240000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed SDK");
  await page.goto("/");
  await page
    .getByRole("button", { name: "创建 PulseManiac 四态表盘", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(21);
  async function exported() {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
      .click();
    return readFile((await (await download).path())!);
  }
  const originalBytes = await exported(),
    files = unzip(originalBytes),
    design = JSON.parse(files.get("design-source.json")!.toString());
  expect(design.starterId).toBe("pulsemaniac");
  expect(files.has("notices/PulseManiac-NOTICE.md")).toBe(true);
  expect(files.has("notices/PulseManiac-PROMPTS.md")).toBe(true);
  const meta = JSON.parse(files.get("gfc-export.json")!.toString());
  expect(meta.starterId).toBe("pulsemaniac");
  expect(meta.appId).not.toBe("1c527eb2365e4be49e09ac95f70747d8");
  const directory = join(tmpdir(), "gfc-pulsemaniac");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "source.zip"), originalBytes);
  const bodies = design.layers.filter(
    (l: any) => l.kind === "image" && l.visibility,
  );
  await page.getByRole("button", { name: "预览", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "表盘独立预览" });
  await dialog.getByLabel("预览显示模式", { exact: true }).selectOption("亮屏");
  for (const [label, state] of [
    ["静息态", 0],
    ["预备态", 1],
    ["扭动态", 2],
    ["彻底疯狂态", 3],
  ] as const) {
    await dialog.getByRole("button", { name: label, exact: true }).click();
    for (let i = 0; i < 4; i++)
      await expect(
        dialog.locator(`[data-layer="${bodies[i].id}"]`),
      ).toHaveCount(i === state ? 1 : 0);
    await page.screenshot({
      path: `docs/screenshots/pulsemaniac-${state}.png`,
    });
  }
  await dialog.getByLabel("模拟心率", { exact: true }).fill("140");
  await expect(dialog.locator(`[data-layer="${bodies[2].id}"]`)).toHaveCount(1);
  await dialog.getByLabel("模拟心率", { exact: true }).fill("141");
  await expect(dialog.locator(`[data-layer="${bodies[3].id}"]`)).toHaveCount(1);
  await dialog.getByLabel("预览显示模式", { exact: true }).selectOption("息屏");
  await expect(dialog.locator(`[data-layer="${bodies[0].id}"]`)).toHaveCount(1);
  await expect(dialog.locator(`[data-layer="${bodies[3].id}"]`)).toHaveCount(0);
  await page.screenshot({ path: "docs/screenshots/pulsemaniac-aod.png" });
  await dialog.getByRole("button", { name: "关闭预览", exact: true }).click();
  async function compile(
    source: Map<string, Buffer>,
    target: string,
    size: string,
  ) {
    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: meta.projectId,
        projectName: "PulseManiac",
        appId: meta.appId,
        target,
        deviceSize: size,
        revision: 0,
      }),
    );
    for (const [name, bytes] of source)
      if (
        /^(manifest\.xml|monkey\.jungle|source\/.*\.mc|resources\/.*\.(xml|svg|fnt)|assets\/.*\.png)$/.test(
          name,
        )
      )
        form.append("files", new Blob([bytes]), name);
    const base = process.env.GFC_TEST_URL!,
      r = await fetch(base + "/api/builds", { method: "POST", body: form });
    expect(r.status, await r.clone().text()).toBe(202);
    const job = await r.json();
    for (let i = 0; i < 150; i++) {
      const state = await (
        await fetch(base + "/api/builds/" + job.buildId)
      ).json();
      if (
        ["succeeded", "failed", "cancelled", "interrupted"].includes(
          state.status,
        )
      ) {
        expect(
          state.status,
          await (
            await fetch(base + "/api/builds/" + job.buildId + "/logs")
          ).text(),
        ).toBe("succeeded");
        const prg = await fetch(base + state.artifacts[0].url);
        expect(prg.status).toBe(200);
        await writeFile(
          join(directory, target + ".prg"),
          Buffer.from(await prg.arrayBuffer()),
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw Error("Build timeout");
  }
  await compile(files, "venu445mm", "45mm");
  await page.getByText("顶部数据1（默认电量）", { exact: true }).click();
  await page.getByLabel("数据源", { exact: true }).selectOption("calories");
  await page.getByLabel("数据标签", { exact: true }).fill("CAL");
  await page.getByLabel("数据标签", { exact: true }).blur();
  await page.getByRole("button", { name: "适配设备", exact: true }).click();
  await page
    .getByRole("button", { name: "启用多设备适配", exact: true })
    .click();
  await page
    .getByLabel("添加适配设备", { exact: true })
    .selectOption("venu441mm:41mm");
  await page.getByRole("button", { name: "添加并预览", exact: true }).click();
  await page.getByRole("button", { name: /^适配设备/ }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  const edited = unzip(await exported());
  expect(
    JSON.parse(edited.get("design-source.json")!.toString()).layers.some(
      (l: any) =>
        l.kind === "metric" && l.source === "calories" && l.label === "CAL",
    ),
  ).toBe(true);
  await compile(edited, "venu441mm", "41mm");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 PulseManiac", exact: true })
    .click();
  await expect(page.locator(".device")).toContainText("390");
  await expect(page.locator(".layer-row")).toHaveCount(21);
});
