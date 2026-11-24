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
test("TimelyFenix has pinned GPL provenance, dynamic calendar and complete cached weather variants", async ({
  request,
}) => {
  const p = await (await request.get("/templates/timelyfenix.json")).json();
  expect(p.layers).toHaveLength(8);
  expect(p.layers.filter((l: any) => l.kind === "calendar")).toHaveLength(1);
  expect(p.layers.find((l: any) => l.weatherIcon).libraryIcon.id).toContain(
    "meteocons_",
  );
  expect(p.assets).toHaveLength(9);
  expect(p.files.some((f: any) => /\.(fnt|ttf|otf)$/.test(f.path))).toBe(false);
  expect(() => validateProject(p)).not.toThrow();
  const source = p.files.find((f: any) => f.path === "source/App.mc").content;
  expect(source).toContain("Gregorian.info(Time.now(),Time.FORMAT_SHORT)");
  expect(source).toContain("calendarStamp");
  const meta = await (
      await request.get("/reference-notices/provenance.json")
    ).json(),
    origin = meta.bundles.find((b: any) => b.name === "TimelyFenix");
  expect(origin.upstreamCommit).toBe(
    "d38a347a548667780a9f17b84f5f02155687a72c",
  );
  expect(origin.verifiedLicense).toBe(true);
  expect(origin.legacy).toBe(false);
});
test("TimelyFenix protected copy exports licensed native source, recompiles, and edits preserve independent identities", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  test.skip(!process.env.GFC_TEST_URL, "Requires deployed compiler");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "删除 TimelyFenix", exact: true }),
  ).toHaveCount(0);
  const reference = await (
    await request.get("/templates/timelyfenix.json")
  ).json();
  await page
    .getByRole("button", { name: "使用 TimelyFenix", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await expect(page.locator("svg.watch image")).toHaveCount(1);
  await expect(page.locator("svg.watch [data-calendar-cell]")).toHaveCount(21);
  await page.screenshot({ path: "docs/screenshots/timelyfenix-editor.png" });
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
    "TimelyFenix-LICENSE.txt",
    "TimelyFenix-README.md",
    "TimelyFenix-ADAPTATION.md",
  ])
    expect(files.has("notices/" + name)).toBe(true);
  expect(files.has("licenses/Meteocons-LICENSE.txt")).toBe(true);
  expect(files.get("licenses/Meteocons-LICENSE.txt")!.toString()).toContain(
    "Permission",
  );
  expect(
    [...files.keys()].filter(
      (p) => p.startsWith("assets/") && p.endsWith(".png"),
    ),
  ).toHaveLength(9);
  const form = new FormData();
  form.append(
    "project",
    JSON.stringify({
      projectId: meta.projectId,
      appId: meta.appId,
      target: meta.target,
      revision: meta.codeRevision,
      projectName: "TimelyFenix",
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
  await mkdir(join(tmpdir(), "gfc-timely-tests"), { recursive: true });
  await writeFile(
    join(tmpdir(), "gfc-timely-tests", "Venu4_45mm_TimelyFenix.prg"),
    await artifact.body(),
  );
  await page.locator(".layer-row").filter({ hasText: "三周日历" }).click();
  await page.getByLabel("周起始日", { exact: true }).selectOption("sunday");
  await expect(page.locator(".drawer-caption")).toContainText("设计已更新");
  page.on("dialog", (d) => d.accept("TimelyFenix Edit"));
  await page
    .getByRole("button", { name: "TimelyFenix 副本", exact: true })
    .click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "使用 TimelyFenix", exact: true }),
  ).toBeVisible();
  const original = await (
    await request.get("/templates/timelyfenix.json")
  ).json();
  expect(original).toEqual(reference);
});
