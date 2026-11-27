import { test, expect } from "@playwright/test";
import { project, layer } from "../src/domain";
import { localGenerate, LOCAL_PROVENANCE } from "../src/localGenerator";
import { addCodeVersion } from "../src/history";
test("local generator is deterministic and rejects unsupported content without omission", () => {
  const p = project("Clock & Test", true);
  p.layers = [
    layer("time"),
    { ...layer("text"), text: 'HELLO "A"' },
    { ...layer("rect"), strokeEnabled: true, opacity: 0.5 },
  ];
  const files = localGenerate(p);
  expect(localGenerate(p)).toEqual(files);
  expect(files.find((f) => f.path.includes("strings.xml"))?.content).toContain(
    "&amp;",
  );
  expect(files.find((f) => f.path.endsWith("App.mc"))?.content).toContain(
    "onEnterSleep",
  );
  p.layers.push(layer("metric"));
  expect(() => localGenerate(p)).toThrow(/仅支持/);
  p.layers.at(-1)!.exportIncluded = false;
  expect(() => localGenerate(p)).not.toThrow();
  p.layers[0].rotation = 15;
  expect(() => localGenerate(p)).toThrow(/需未旋转/);
});
test("switching primary generator retains old native source and records one provenance per version", () => {
  const p = project("Clock", true);
  p.layers = [layer("time")];
  p.files = [{ path: "source/Old.mc", content: "// original" }];
  p.codeProvenance = { primary: "reference" };
  const next = addCodeVersion(p, localGenerate(p), LOCAL_PROVENANCE);
  expect(next.versions).toHaveLength(2);
  expect(next.versions[0].files).toEqual(p.files);
  expect(next.versions.map((v) => v.provenance?.primary)).toEqual([
    "reference",
    "deterministic",
  ]);
  expect(next.codeProvenance).toEqual(LOCAL_PROVENANCE);
  expect(p.files[0].path).toContain("Old");
});
test("local generation works without a model and provenance survives reload", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("Local Clock"));
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByLabel("初始布局", { exact: true }).selectOption("blank");
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page.getByRole("button", { name: "时间", exact: true }).click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "打开 Local Clock", exact: true })
    .click();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await expect(
    page.getByText(/代码版本.*deterministic.*basic-33-layer-source-map/),
  ).toBeVisible();
});

test("changing generation source requires confirmation and retains recoverable code", async ({
  page,
}) => {
  const p = project("Switch Source", true);
  p.layers = [layer("time")];
  p.files = localGenerate(p);
  p.codeRevision = p.revision;
  p.codeProvenance = { primary: "ai" };
  await page.goto("/");
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("garmin-face-creator", 2);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put(value);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    p,
  );
  await page.reload();
  await page.getByRole("button", { name: "我的表盘", exact: true }).click();
  await page
    .getByRole("button", { name: "打开 Switch Source", exact: true })
    .click();
  await page
    .getByRole("button", { name: "本地生成（试验）", exact: true })
    .click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "应用生成结果", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "应用生成结果", exact: true }).click();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await expect(page.locator(".history")).toContainText("2/20");
  await expect(
    page.getByText(/代码版本.*deterministic.*basic-33-layer-source-map/),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "恢复代码", exact: true })
    .first()
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  const stored = await page.evaluate(
    (id) =>
      new Promise<any>((resolve) => {
        const r = indexedDB.open("garmin-face-creator", 2);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction("projects").objectStore("projects").get(id);
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
        };
      }),
    p.id,
  );
  expect(stored.codeProvenance.primary).toBe("ai");
});
