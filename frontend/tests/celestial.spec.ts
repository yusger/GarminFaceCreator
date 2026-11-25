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
test("Celestial retains pinned MIT source and independent dynamic sky body landscape controls", async ({
  request,
}) => {
  const p = await (await request.get("/templates/celestial.json")).json();
  expect(() => validateProject(p)).not.toThrow();
  expect(p.layers).toHaveLength(10);
  expect(
    p.layers
      .filter((l: any) => l.kind === "celestial")
      .map((l: any) => l.solarPart),
  ).toEqual(["sky", "body"]);
  expect(p.layers.filter((l: any) => l.kind === "rect")).toHaveLength(3);
  expect(p.layers.some((l: any) => l.kind === "image")).toBe(false);
  const source = p.files.find((f: any) => f.path === "source/App.mc").content;
  expect(source).toContain("Weather.getSunrise(info.position,query)");
  expect(source).not.toContain("new Position.Location");
  expect(p.files.find((f: any) => f.path === "manifest.xml").content).toContain(
    'id="Positioning"',
  );
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    r = meta.bundles.find((b: any) => b.name === "Celestial");
  expect(r.upstreamCommit).toBe("c5d124c54866f23dbee7528a488c3802d120b715");
  expect(r.verifiedLicense).toBe(true);
  expect(r.legacy).toBe(false);
});
test("protected Celestial copy exports complete notices and compiles before and after editing", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 Celestial", exact: true }),
  ).toHaveCount(0);
  const reference = await (
    await request.get("/templates/celestial.json")
  ).json();
  await page
    .getByRole("button", { name: "使用 Celestial", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(10);
  await page.screenshot({ path: "docs/screenshots/celestial-editor.png" });
  async function exportAndCompile(language: string) {
    const pending = page.waitForEvent("download", { timeout: 15000 });
    await page
      .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
      .click();
    const files = unzip(await readFile((await (await pending).path())!)),
      meta = JSON.parse(files.get("gfc-export.json")!.toString());
    expect(meta.projectId).not.toBe(reference.id);
    expect(meta.appId).not.toBe(reference.appId);
    for (const name of [
      "Celestial-LICENSE.txt",
      "Celestial-README.md",
      "Celestial-ADAPTATION.md",
      "Celestial-original-View.mc.txt",
    ])
      expect(files.has("notices/" + name)).toBe(true);
    expect(
      meta.templateSources.some(
        (t: any) =>
          t.version ===
          (language === "default" ? "basic-11-solar-events" : "basic-15-conditions"),
      ),
    ).toBe(true);
    expect(files.get("notices/Celestial-LICENSE.txt")!.toString()).toContain(
      "Zachary Smith",
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
        projectName: "Celestial_" + language,
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
    await mkdir(join(tmpdir(), "gfc-celestial-tests"), { recursive: true });
    await writeFile(
      join(
        tmpdir(),
        "gfc-celestial-tests",
        `Venu4_45mm_Celestial_${language}.prg`,
      ),
      await artifact.body(),
    );
  }
  await exportAndCompile("default");
  page.on("dialog", (d) => d.accept("Celestial Edit"));
  await page
    .getByRole("button", { name: "Celestial 副本", exact: true })
    .click();
  await page.locator(".layer-row").filter({ hasText: "天空" }).click();
  await page.getByLabel("场景夜间颜色", { exact: true }).fill("#162d46");
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/celestial-edited.png" });
  await exportAndCompile("edited");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 Celestial", exact: true }),
  ).toBeVisible();
  expect(await (await request.get("/templates/celestial.json")).json()).toEqual(
    reference,
  );
});
