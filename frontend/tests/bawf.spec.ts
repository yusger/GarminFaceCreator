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
test("BAWF retains explicit GPL source headers, editable hands and fixed-Jungle monochrome scope", async ({
  request,
}) => {
  const p = await (await request.get("/templates/bawf.json")).json();
  expect(() => validateProject(p)).not.toThrow();
  expect(p.layers).toHaveLength(18);
  expect(
    p.layers.filter((l: any) => l.kind === "hand").map((l: any) => l.handType),
  ).toEqual(["hour", "minute"]);
  expect(p.layers.filter((l: any) => l.kind === "text")).toHaveLength(12);
  expect(p.layers.some((l: any) => l.kind === "image")).toBe(false);
  const source = p.files.find((f: any) => f.path === "source/App.mc").content;
  expect(source).toContain("Copyright (c)2018-2023 Kevin Boone");
  expect(source).toContain("GNU Public Licence, v3.0");
  expect(source).not.toContain("BufferedBitmap");
  expect(source).not.toContain("Timer");
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    r = meta.bundles.find((b: any) => b.name === "BAWF");
  expect(r.upstreamCommit).toBe("243293ba4d2a4f03c4ed767bb072a7838386c741");
  expect(r.verifiedLicense).toBe(true);
  expect(r.legacy).toBe(false);
});
test("protected BAWF copy exports complete notices and compiles before and after editing", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 BAWF", exact: true }),
  ).toHaveCount(0);
  const reference = await (await request.get("/templates/bawf.json")).json();
  await page.getByRole("button", { name: "使用 BAWF", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator(".layer-row")).toHaveCount(18);
  await page.screenshot({ path: "docs/screenshots/bawf-editor.png" });
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
      "BAWF-GPL-v3.txt",
      "BAWF-README.md",
      "BAWF-original-App.mc.txt",
      "BAWF-original-View.mc.txt",
      "BAWF-ADAPTATION.md",
    ])
      expect(files.has("notices/" + name)).toBe(true);
    expect(
      meta.templateSources.some((t: any) => t.version === "basic-13-paint"),
    ).toBe(true);
    expect(files.get("notices/BAWF-original-App.mc.txt")!.toString()).toContain(
      "Copyright (c)2018-2023 Kevin Boone",
    );
    const design = JSON.parse(files.get("design-source.json")!.toString());
    expect(design.layers.find((l: any) => l.name === "背景").color).toBe(
      language === "default" ? "#000000" : "#ffffff",
    );
    expect(
      design.layers
        .filter((l: any) => l.name !== "背景")
        .every(
          (l: any) =>
            l.color === (language === "default" ? "#ffffff" : "#000000"),
        ),
    ).toBe(true);
    const form = new FormData();
    form.append(
      "project",
      JSON.stringify({
        projectId: meta.projectId,
        appId: meta.appId,
        target: meta.target,
        revision: meta.codeRevision,
        deviceSize: meta.deviceSize,
        projectName: "BAWF_" + language,
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
    await mkdir(join(tmpdir(), "gfc-bawf-tests"), { recursive: true });
    await writeFile(
      join(tmpdir(), "gfc-bawf-tests", `Venu4_45mm_BAWF_${language}.prg`),
      await artifact.body(),
    );
  }
  await exportAndCompile("default");
  page.on("dialog", (d) => d.accept("BAWF Edit"));
  await page.getByRole("button", { name: "BAWF 副本", exact: true }).click();
  for (const [name, color] of [
    ["背景", "#ffffff"],
    ...Array.from({ length: 12 }, (_, i) => [
      "时标" + String(i + 1).padStart(2, "0"),
      "#000000",
    ]),
    ...["日期", "电量", "时针", "分针", "转轴"].map((n) => [n, "#000000"]),
  ]) {
    await page.locator(".layer-row").filter({ hasText: name }).click();
    await page.locator(".color-control input[type=color]").fill(color);
  }
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/bawf-edited.png" });
  await exportAndCompile("edited");
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 BAWF", exact: true }),
  ).toBeVisible();
  expect(await (await request.get("/templates/bawf.json")).json()).toEqual(
    reference,
  );
});
