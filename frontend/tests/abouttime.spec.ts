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
test("AboutTime pins MIT upstream, uses editable word rows and distributes no font binaries", async ({
  request,
}) => {
  const p = await (await request.get("/templates/abouttime.json")).json();
  expect(p.layers).toHaveLength(8);
  expect(
    p.layers
      .filter((l: any) => l.kind === "wordTime")
      .map((l: any) => l.wordRow),
  ).toEqual(["top", "middle", "bottom"]);
  expect(p.files.some((f: any) => f.path === "source/GfcWordTime.mc")).toBe(
    true,
  );
  expect(p.files.some((f: any) => /\.(fnt|ttf|otf)$/.test(f.path))).toBe(false);
  expect(() => validateProject(p)).not.toThrow();
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    origin = meta.bundles.find((b: any) => b.name === "AboutTime");
  expect(origin.upstreamCommit).toBe(
    "4fdf09bcf784ecf385b9dce546af3f277e13caa5",
  );
  expect(origin.verifiedLicense).toBe(true);
  expect(origin.legacy).toBe(false);
});
test("protected AboutTime copy exports one complete set of MIT notices and compiles English and Chinese row layouts", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 AboutTime", exact: true }),
  ).toHaveCount(0);
  const reference = await (
    await request.get("/templates/abouttime.json")
  ).json();
  await page
    .getByRole("button", { name: "使用 AboutTime", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator("svg.watch [data-word-line]")).toHaveCount(3);
  await page.screenshot({ path: "docs/screenshots/abouttime-editor.png" });
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
      "AboutTime-LICENSE.txt",
      "AboutTime-README.md",
      "AboutTime-English-strings.xml",
      "AboutTime-Chinese-strings.xml",
      "AboutTime-ADAPTATION.md",
    ])
      expect(files.has("notices/" + name)).toBe(true);
    expect(meta.wordTimeLocale.license).toBe("MIT");
    expect(files.get("notices/AboutTime-LICENSE.txt")!.toString()).toContain(
      "Samuel Rinnetmäki",
    );
    if (language === "zh")
      expect(files.get("manifest.xml")!.toString()).toContain(">zhs<");
    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: meta.projectId,
        appId: meta.appId,
        target: meta.target,
        revision: meta.codeRevision,
        deviceSize: meta.deviceSize,
        projectName: "AboutTime_" + language,
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
    await mkdir(join(tmpdir(), "gfc-abouttime-tests"), { recursive: true });
    await writeFile(
      join(
        tmpdir(),
        "gfc-abouttime-tests",
        `Venu4_45mm_AboutTime_${language}.prg`,
      ),
      await artifact.body(),
    );
  }
  await exportAndCompile("en");
  page.on("dialog", (d) => d.accept("AboutTime Edit"));
  await page
    .getByRole("button", { name: "AboutTime 副本", exact: true })
    .click();
  for (const name of ["报时上行", "报时中行", "报时下行"]) {
    await page.locator(".layer-row").filter({ hasText: name }).click();
    await page.getByLabel("报时语言", { exact: true }).selectOption("zh");
  }
  await expect(page.locator('svg.watch [data-word-language="zh"]')).toHaveCount(
    3,
  );
  await expect(page.locator('svg.watch [data-word-line="2"]')).toHaveText(
    "十点了",
  );
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/abouttime-zh-editor.png" });
  await exportAndCompile("zh");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 AboutTime", exact: true }),
  ).toBeVisible();
  expect(await (await request.get("/templates/abouttime.json")).json()).toEqual(
    reference,
  );
});
