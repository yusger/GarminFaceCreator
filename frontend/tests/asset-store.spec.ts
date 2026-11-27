import { test, expect, type Page } from "@playwright/test";
import { project, layer } from "../src/domain";
import { png } from "../../backend/tests/image-fixture.mjs";
async function contents(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any>((resolve) => {
        const r = indexedDB.open("garmin-face-creator", 2);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(["projects", "assets", "assetRefs"]),
            projects = tx.objectStore("projects").getAll(),
            assets = tx.objectStore("assets").getAll(),
            refs = tx.objectStore("assetRefs").getAll();
          tx.oncomplete = () => {
            db.close();
            resolve({
              projects: projects.result,
              assets: assets.result,
              refs: refs.result,
            });
          };
        };
      }),
  );
}
test("legacy inline images migrate atomically and remain exportable", async ({
  page,
}) => {
  await page.goto("/api/health");
  const legacy = {
    ...project("旧图片项目"),
    schemaVersion: 1,
    layers: [
      {
        ...layer("image"),
        image: "data:image/png;base64," + png(255, 0, 0).toString("base64"),
      },
    ],
  };
  await page.evaluate(
    (p) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("garmin-face-creator", 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore("projects", { keyPath: "id" });
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put(p);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    legacy,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /^我的表盘/ }).click();
  await page
    .getByRole("button", { name: "打开 旧图片项目", exact: true })
    .click();
  await expect(page.locator("svg.watch image")).toHaveCount(1);
  const data = await contents(page);
  expect(data.assets).toHaveLength(1);
  expect(data.refs).toHaveLength(1);
  expect(data.projects[0].layers[0].image).toBeUndefined();
  expect(data.projects[0].layers[0].imageAssetStorageId).toBe(
    data.assets[0].id,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出项目", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("旧图片项目.json");
});
test("shared assets survive deletion of one project even with a stale counter", async ({
  page,
}) => {
  await page.goto("/");
  page.on("dialog", (d) => d.accept());
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /^内置表盘/ }).click();
    await page
      .getByRole("button", { name: "使用 ClownWatch", exact: true })
      .click();
    await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "项目", exact: true }).click();
  }
  let data = await contents(page);
  expect(data.assets).toHaveLength(1);
  expect(data.refs).toHaveLength(2);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("garmin-face-creator", 2);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("assets", "readwrite"),
            s = tx.objectStore("assets"),
            get = s.getAll();
          get.onsuccess = () =>
            get.result.forEach((v) => s.put({ ...v, refCount: 0 }));
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.getByRole("button", { name: /^我的表盘/ }).click();
  await page
    .getByRole("button", { name: "删除 ClownWatch 副本", exact: true })
    .click();
  data = await contents(page);
  expect(data.assets).toHaveLength(1);
  expect(data.refs).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: /^我的表盘/ }).click();
  await page
    .getByRole("button", { name: "打开 ClownWatch 副本 2", exact: true })
    .click();
  await expect(page.locator("svg.watch image")).toHaveCount(1);
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await page
    .getByRole("button", { name: "删除 ClownWatch 副本 2", exact: true })
    .click();
  data = await contents(page);
  expect(data.assets).toHaveLength(0);
  expect(data.refs).toHaveLength(0);
});
test("snapshot references protect removed image and transaction quota failure creates no orphan", async ({
  page,
}) => {
  await page.goto("/");
  let prompt = 0;
  page.on("dialog", (d) =>
    d.accept(
      d.type() === "prompt"
        ? prompt++ === 0
          ? "图片引用测试"
          : prompt === 2
            ? "有图"
            : "无图"
        : "",
    ),
  );
  await page.getByText("空白画布", { exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let fail = true;
    IDBObjectStore.prototype.put = function (...args: any[]) {
      if (this.name === "assets" && fail) {
        fail = false;
        throw new DOMException("full", "QuotaExceededError");
      }
      return (original as any).apply(this, args);
    } as typeof original;
  });
  await page
    .locator('input[hidden][accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "图片.png",
      mimeType: "image/png",
      buffer: png(255, 0, 0),
    });
  await expect(page.locator(".storage-error")).toContainText("空间不足");
  expect((await contents(page)).assets).toHaveLength(0);
  await page.getByRole("button", { name: "重试保存", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await page.getByRole("button", { name: "保存设计快照", exact: true }).click();
  await page.getByRole("button", { name: "删除图层", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  expect((await contents(page)).assets).toHaveLength(1);
  await page.getByRole("button", { name: "保存设计快照", exact: true }).click();
  await page
    .getByRole("button", { name: "删除设计快照 有图", exact: true })
    .click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  expect((await contents(page)).assets).toHaveLength(0);
});

test("failed asset migration leaves old inline database intact and succeeds after retry", async ({
  page,
}) => {
  await page.goto("/api/health");
  const legacy = {
    ...project("迁移回滚"),
    schemaVersion: 1,
    layers: [
      {
        ...layer("image"),
        image: "data:image/png;base64," + png(0, 0, 255).toString("base64"),
      },
    ],
  };
  await page.evaluate(
    (p) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("garmin-face-creator", 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore("projects", { keyPath: "id" });
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put(p);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
    legacy,
  );
  await page.addInitScript(() => {
    if (sessionStorage.getItem("migration-fault")) return;
    sessionStorage.setItem("migration-fault", "injected");
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: any[]) {
      if (this.name === "assets")
        throw new DOMException("full", "QuotaExceededError");
      return (original as any).apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("空间不足");
  const intact = await page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const r = indexedDB.open("garmin-face-creator", 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            read = db.transaction("projects").objectStore("projects").getAll();
          read.onsuccess = () => {
            const value = {
              version: db.version,
              inline: read.result[0].layers[0].image,
            };
            db.close();
            resolve(value);
          };
        };
      }),
  );
  expect(intact.version).toBe(1);
  expect(intact.inline).toContain("data:image/png");
  await page.reload();
  await page.getByRole("button", { name: /^我的表盘/ }).click();
  await page
    .getByRole("button", { name: "打开 迁移回滚", exact: true })
    .click();
  await expect(page.locator("svg.watch image")).toHaveCount(1);
  expect((await contents(page)).assets).toHaveLength(1);
});
