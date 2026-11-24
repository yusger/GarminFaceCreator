import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { project, layer } from "../src/domain";
import { localGenerate } from "../src/localGenerator";
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
test("reference and generator source snapshots retain exact build fingerprints", async ({
  request,
}) => {
  const r = await request.get("/reference-notices/provenance.json");
  expect(r.ok()).toBeTruthy();
  const origins = await r.json();
  expect(origins.bundles).toHaveLength(9);
  expect(origins.generators).toHaveLength(3);
  for (const file of new Set<string>(
    origins.bundles.flatMap((b: any) => b.files),
  )) {
    const response = await request.get("/reference-notices/" + file);
    expect(response.ok(), file).toBe(true);
    expect(
      createHash("sha256")
        .update(await response.body())
        .digest("hex"),
      file,
    ).toBe(
      createHash("sha256")
        .update(await readFile("frontend/public/reference-notices/" + file))
        .digest("hex"),
    );
  }

  for (const entry of [...origins.bundles, ...origins.generators]) {
    const response = await request.get(entry.path);
    expect(response.ok()).toBeTruthy();
    expect(
      createHash("sha256")
        .update(await response.body())
        .digest("hex"),
    ).toBe(entry.sha256);
  }
  expect(
    origins.bundles.find((b: any) => b.name === "SkyRing").status,
  ).toContain("not verified");
  expect(
    origins.bundles
      .filter((b: any) => b.legacy)
      .every((b: any) => b.upstreamCommit === null),
  ).toBe(true);
});
for (const mode of ["local", "unmarked"])
  test(
    "source export scopes template notices to actual contents: " + mode,
    async ({ page }) => {
      const p = project("Attribution Test", true);
      p.layers = [layer("time")];
      p.files = localGenerate(p);
      p.codeRevision = p.revision;
      if (mode === "unmarked") {
        p.files = p.files.map((f) =>
          f.path === "source/App.mc"
            ? {
                ...f,
                content: f.content.replace(
                  /^\/\/ GarminFaceCreator[^\n]*\n/,
                  "// Unmarked test fixture\n",
                ),
              }
            : f,
        );
        p.codeProvenance = { primary: "ai" };
      } else
        p.codeProvenance = {
          primary: "deterministic",
          generatorVersion: "basic-2-icons",
        };
      await page.goto("/");
      await page.evaluate(
        (value) =>
          new Promise<void>((resolve) => {
            const r = indexedDB.open("garmin-face-creator", 2);
            r.onsuccess = () => {
              const db = r.result,
                tx = db.transaction("projects", "readwrite");
              tx.objectStore("projects").put(value);
              tx.oncomplete = () => {
                db.close();
                resolve();
              };
            };
          }),
        p,
      );
      await page.reload();
      await page
        .getByRole("button", { name: "打开 Attribution Test", exact: true })
        .click();
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "导出源码工程 ZIP", exact: true })
        .click();
      const files = unzip(await readFile((await (await pending).path())!)),
        meta = JSON.parse(files.get("gfc-export.json")!.toString());
      expect(files.has("design-source.json")).toBe(true);
      expect(meta.templateSources.length).toBe(mode === "local" ? 1 : 0);
      expect(files.has("licenses/GarminFaceCreator-LICENSE.txt")).toBe(
        mode === "local",
      );
      if (mode === "local") {
        expect(files.has("notices/generator-sources/localGenerator.ts")).toBe(
          true,
        );
        const snapshot = meta.templateSources[0].sourceContext;
        expect(
          createHash("sha256")
            .update(files.get("notices/generator-sources/localGenerator.ts")!)
            .digest("hex"),
        ).toBe(snapshot.sha256);
        expect(meta.referenceSnapshot).toBeNull();
      }
      expect(
        [...files.keys()].some((path) =>
          /developer_key|localkey|gfc-profiles/i.test(path),
        ),
      ).toBe(false);
    },
  );
test("reference cards show actual licensing uncertainty rather than a generic open-source badge", async ({
  page,
}) => {
  await page.goto("/");
  const sky = page.locator(".project-card").filter({
    has: page.getByRole("button", { name: "使用 SkyRing", exact: true }),
  });
  await sky.getByText("参考来源与许可", { exact: true }).click();
  await expect(sky).toContainText("上游许可尚未确认");
  const fine = page.locator(".project-card").filter({
    has: page.getByRole("button", { name: "使用 fine-o-clock", exact: true }),
  });
  await fine.getByText("参考来源与许可", { exact: true }).click();
  await expect(fine).toContainText("LGPLv3");
  await expect(fine).toContainText("GPLv3+");
});
