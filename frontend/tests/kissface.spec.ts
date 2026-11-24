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
test("KISSFace has pinned MIT provenance and genuine editable data controls", async ({
  request,
}) => {
  const p = await (await request.get("/templates/kissface.json")).json();
  expect(() => validateProject(p)).not.toThrow();
  expect(p.layers).toHaveLength(15);
  expect(
    p.layers.filter((l: any) => l.kind === "time").map((l: any) => l.timePart),
  ).toEqual(["hourTens", "hourOnes", "minuteTens", "minuteOnes"]);
  expect(
    new Set(
      p.layers.filter((l: any) => l.kind === "time").map((l: any) => l.color),
    ).size,
  ).toBe(4);
  expect(
    p.layers.filter((l: any) => l.kind === "meter").map((l: any) => l.source),
  ).toEqual(["steps", "battery"]);
  expect(
    p.layers.find((l: any) => l.kind === "metric" && l.source === "heartRate")
      .metricDecoration,
  ).toBe(false);
  expect(p.files.some((f: any) => /\.(fnt|ttf|otf)$/.test(f.path))).toBe(false);
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    r = meta.bundles.find((b: any) => b.name === "KISSFace");
  expect(r.upstreamCommit).toBe("35617422cfc6e8db0c703b247c54835c3d77008c");
  expect(r.verifiedLicense).toBe(true);
  expect(r.legacy).toBe(false);
});
test("protected KISSFace copy exports complete notices and compiles before and after editing", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 KISSFace", exact: true }),
  ).toHaveCount(0);
  const reference = await (
    await request.get("/templates/kissface.json")
  ).json();
  await page
    .getByRole("button", { name: "使用 KISSFace", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(15);
  await page.screenshot({ path: "docs/screenshots/kissface-editor.png" });
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
      "KISSFace-LICENSE.txt",
      "KISSFace-README.md",
      "KISSFace-ADAPTATION.md",
    ])
      expect(files.has("notices/" + name)).toBe(true);
    expect(
      meta.templateSources.some((t: any) => t.version === "basic-8-digits-hr"),
    ).toBe(true);
    expect(files.get("notices/KISSFace-LICENSE.txt")!.toString()).toContain(
      "Delfim Machado",
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
        projectName: "KISSFace_" + language,
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
    await mkdir(join(tmpdir(), "gfc-kissface-tests"), { recursive: true });
    await writeFile(
      join(
        tmpdir(),
        "gfc-kissface-tests",
        `Venu4_45mm_KISSFace_${language}.prg`,
      ),
      await artifact.body(),
    );
  }
  await exportAndCompile("default");
  page.on("dialog", (d) => d.accept("KISSFace Edit"));
  await page
    .getByRole("button", { name: "KISSFace 副本", exact: true })
    .click();
  await page.locator(".layer-row").filter({ hasText: "时十位" }).click();
  await page.locator(".color-control input[type=color]").fill("#ff88dd");
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/kissface-edited.png" });
  await exportAndCompile("edited");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 KISSFace", exact: true }),
  ).toBeVisible();
  expect(await (await request.get("/templates/kissface.json")).json()).toEqual(
    reference,
  );
});
