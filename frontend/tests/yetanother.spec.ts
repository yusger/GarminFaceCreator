import { test, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateProject } from "../src/domain";
function unzip(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18),
      n = bytes.readUInt16LE(offset + 26),
      e = bytes.readUInt16LE(offset + 28),
      start = offset + 30 + n + e;
    const name = bytes.subarray(offset + 30, offset + 30 + n).toString();
    expect(files.has(name)).toBe(false);
    files.set(name, bytes.subarray(start, start + size));
    offset = start + size;
  }
  return files;
}
test("YetAnother retains pinned MIT source and independently editable split local and fixed-zone time", async ({
  request,
}) => {
  const p = await (await request.get("/templates/yetanother.json")).json();
  expect(() => validateProject(p)).not.toThrow();
  expect(p.layers).toHaveLength(13);
  expect(
    p.layers
      .filter((l: any) => l.kind === "time")
      .map((l: any) => l.timePart || "full"),
  ).toEqual(["hours", "minutes", "full"]);
  expect(p.layers.find((l: any) => l.name === "第二时区").timeUtcOffset).toBe(
    0,
  );
  expect(
    p.layers.filter((l: any) => l.kind === "metric").map((l: any) => l.source),
  ).toEqual(["battery", "steps", "heartRate", "distance", "calories"]);
  expect(p.layers.some((l: any) => l.kind === "image")).toBe(false);
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    r = meta.bundles.find((b: any) => b.name === "YetAnother");
  expect(r.upstreamCommit).toBe("f9db8c2d3a1f10633c195e5516d96d45f0f61340");
  expect(r.verifiedLicense).toBe(true);
  expect(r.legacy).toBe(false);
});
test("protected YetAnother copy exports complete notices and compiles before and after editing", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 YetAnother", exact: true }),
  ).toHaveCount(0);
  const reference = await (
    await request.get("/templates/yetanother.json")
  ).json();
  await page
    .getByRole("button", { name: "使用 YetAnother", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(13);
  await page.screenshot({ path: "docs/screenshots/yetanother-editor.png" });
  async function exportAndCompile(language: string) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
      .click();
    const files = unzip(await readFile((await (await pending).path())!)),
      meta = JSON.parse(files.get("gfc-export.json")!.toString());
    expect(meta.projectId).not.toBe(reference.id);
    expect(meta.appId).not.toBe(reference.appId);
    for (const name of [
      "YetAnother-LICENSE.txt",
      "YetAnother-README.md",
      "YetAnother-ADAPTATION.md",
      "YetAnother-layout-454.xml",
    ])
      expect(files.has("notices/" + name)).toBe(true);
    expect(
      meta.templateSources.some(
        (t: any) =>
          t.version ===
          (language === "default" ? "basic-9-fixed-zone" : "basic-12-hands"),
      ),
    ).toBe(true);
    expect(files.get("notices/YetAnother-LICENSE.txt")!.toString()).toContain(
      "Laverlin",
    );

    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: meta.projectId,
        appId: meta.appId,
        target: meta.target,
        revision: meta.codeRevision,
        deviceSize: meta.deviceSize,
        projectName: "YetAnother_" + language,
      }),
    );
    for (const [path, data] of files)
      if (
        /^(manifest\.xml|monkey\.jungle|source\/|resources\/|assets\/)/.test(
          path,
        )
      )
        form.append("files", new Blob([data]), path);
    const r = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
      method: "POST",
      body: form,
    });
    expect(r.status).toBe(202);
    const job = await r.json();
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/builds/${job.buildId}`)).json())
            .status,
        { timeout: 130000, intervals: [1000] },
      )
      .toBe("succeeded");
    const state = await (
      await request.get(`/api/builds/${job.buildId}`)
    ).json();
    const artifact = await request.get(state.artifacts[0].url);
    expect(artifact.ok()).toBe(true);
    await mkdir(join(tmpdir(), "gfc-yetanother-tests"), { recursive: true });
    await writeFile(
      join(
        tmpdir(),
        "gfc-yetanother-tests",
        `Venu4_45mm_YetAnother_${language}.prg`,
      ),
      await artifact.body(),
    );
  }
  await exportAndCompile("default");
  page.on("dialog", (d) => d.accept("YetAnother Edit"));
  await page
    .getByRole("button", { name: "YetAnother 副本", exact: true })
    .click();
  await page.locator(".layer-row").filter({ hasText: "第二时区" }).click();
  await page.getByLabel("UTC 偏移分钟", { exact: true }).fill("345");
  await page.getByLabel("UTC 偏移分钟", { exact: true }).blur();
  await page.locator(".layer-row").filter({ hasText: "时区标签" }).click();
  await page.getByLabel("文字内容", { exact: true }).fill("UTC +05:45");
  await page.getByLabel("文字内容", { exact: true }).blur();
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/yetanother-edited.png" });
  await exportAndCompile("edited");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 YetAnother", exact: true }),
  ).toBeVisible();
  expect(
    await (await request.get("/templates/yetanother.json")).json(),
  ).toEqual(reference);
});
