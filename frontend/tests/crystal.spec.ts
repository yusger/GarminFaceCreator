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
    files.set(
      bytes.subarray(offset + 30, offset + 30 + n).toString(),
      bytes.subarray(start, start + size),
    );
    offset = start + size;
  }
  return files;
}
test("Crystal has pinned reviewed provenance and editable data without upstream font binaries", async ({
  request,
}) => {
  const p = await (await request.get("/templates/crystal.json")).json();
  expect(p.layers).toHaveLength(15);
  expect(p.layers.filter((l: any) => l.kind === "meter")).toHaveLength(2);
  expect(
    p.layers.filter((l: any) => l.kind === "time").map((l: any) => l.timePart),
  ).toEqual(["hours", "minutes"]);
  expect(
    p.layers.filter((l: any) => l.kind === "metric").map((l: any) => l.source),
  ).toEqual(
    expect.arrayContaining([
      "battery",
      "seconds",
      "steps",
      "distance",
      "calories",
    ]),
  );
  expect(
    p.layers
      .filter((l: any) => l.kind === "image")
      .every((l: any) => l.libraryIcon?.id.startsWith("lucide_")),
  ).toBe(true);
  expect(p.files.some((f: any) => /\.(fnt|ttf|otf)$/.test(f.path))).toBe(false);
  expect(() => validateProject(p)).not.toThrow();
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    origin = meta.bundles.find((b: any) => b.name === "Crystal");
  expect(origin.upstreamCommit).toBe(
    "bcc340484bd2a3a09f13b22a2d0d6dae3b4de9c7",
  );
  expect(origin.verifiedLicense).toBe(true);
  expect(origin.legacy).toBe(false);
  expect(
    await (await request.get("/reference-notices/Crystal-LICENSE.txt")).text(),
  ).toContain("Version 3, 29 June 2007");
});
test("Crystal protected copy exports licensed native source, recompiles, and edits preserve independent identities", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 Crystal", exact: true }),
  ).toHaveCount(0);
  const reference = await (await request.get("/templates/crystal.json")).json();
  await page.getByRole("button", { name: "使用 Crystal", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator("svg.watch image")).toHaveCount(3);
  await expect(
    page.locator("svg.watch polygon[data-meter-segment]"),
  ).toHaveCount(40);
  await page.screenshot({ path: "docs/screenshots/crystal-editor.png" });
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
    .click();
  const archive = await pending;
  const files = unzip(await readFile((await archive.path())!)),
    meta = JSON.parse(files.get("gfc-export.json")!.toString());
  expect(meta.projectId).not.toBe(reference.id);
  expect(meta.appId).not.toBe(reference.appId);
  expect(meta.target).toBe("venu445mm");
  for (const name of [
    "Crystal-LICENSE.txt",
    "Crystal-README.md",
    "Crystal-layout-454.xml",
    "Crystal-ADAPTATION.md",
  ])
    expect(files.has("notices/" + name)).toBe(true);
  expect(files.has("licenses/Lucide-LICENSE.txt")).toBe(true);
  expect(files.get("licenses/Lucide-LICENSE.txt")!.toString()).toContain(
    "Permission",
  );
  expect(
    [...files.keys()].filter(
      (p) => p.startsWith("assets/") && p.endsWith(".png"),
    ),
  ).toHaveLength(3);
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: meta.projectId,
      appId: meta.appId,
      target: meta.target,
      revision: meta.codeRevision,
      projectName: "Crystal",
      deviceSize: meta.deviceSize,
    }),
  );
  for (const [path, data] of files)
    if (
      /^(manifest\.xml|monkey\.jungle|source\/|resources\/|assets\/)/.test(path)
    )
      form.append("files", new Blob([data]), path);
  const response = await fetch(process.env.GFC_TEST_URL + "/api/builds", {
    method: "POST",
    body: form,
  });
  expect(response.status).toBe(202);
  const job = await response.json();
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/builds/${job.buildId}`)).json()).status,
      { timeout: 130000, intervals: [1000] },
    )
    .toBe("succeeded");
  const state = await (await request.get(`/api/builds/${job.buildId}`)).json();
  const artifact = await request.get(state.artifacts[0].url);
  expect(artifact.ok()).toBe(true);
  await mkdir(join(tmpdir(), "gfc-crystal-tests"), { recursive: true });
  await writeFile(
    join(tmpdir(), "gfc-crystal-tests", "Venu4_45mm_Crystal.prg"),
    await artifact.body(),
  );
  await page.locator(".layer-row").filter({ hasText: "步数弧形目标" }).click();
  await page.getByLabel("目标数值", { exact: true }).fill("12000");
  await page.getByLabel("目标数值", { exact: true }).blur();
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  page.on("dialog", (d) => d.accept("Crystal Edit"));
  await page.getByRole("button", { name: "Crystal 副本", exact: true }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 Crystal", exact: true }),
  ).toBeVisible();
  const original = await (await request.get("/templates/crystal.json")).json();
  expect(original).toEqual(reference);
});
