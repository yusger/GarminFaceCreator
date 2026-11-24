import { test, expect, type Page } from "@playwright/test";
async function create(page: Page) {
  await page.goto("/");
  page.on("dialog", (d) => d.accept("存储测试"));
  await page.getByRole("button", { name: "新建表盘", exact: true }).click();
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "文字", exact: true }).click();
  await page.getByLabel("图层名称").fill("初始图层");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
}
async function disk(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const req = indexedDB.open("garmin-face-creator", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("projects");
          const r = tx.objectStore("projects").getAll();
          tx.oncomplete = () => {
            db.close();
            resolve(r.result);
          };
          tx.onabort = () => reject(tx.error);
        };
      }),
  );
}
test("atomic conflict protects equal revisions without BroadcastChannel and offers recovery", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { value: undefined });
  });
  await create(page);
  const second = await context.newPage();
  second.on("dialog", (d) => d.accept());
  await second.goto("/");
  await second
    .getByRole("button", { name: "打开 存储测试", exact: true })
    .click();
  await second.getByText("初始图层", { exact: true }).click();
  await page.getByLabel("图层名称").fill("页面A的修改");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await second.getByLabel("图层名称").fill("页面B的修改");
  await expect(second.getByRole("alert")).toContainText("其他页面已保存");
  const original = (await disk(page))[0];
  expect(original.layers.at(-1).name).toBe("页面A的修改");
  await second
    .getByRole("button", { name: "放弃本次保存", exact: true })
    .click();
  await expect(second.getByLabel("图层名称")).toHaveValue("页面B的修改");
  const pending = second.waitForEvent("download");
  await second
    .getByRole("button", { name: "导出未保存设计", exact: true })
    .click();
  expect((await pending).suggestedFilename()).toBe("存储测试.json");
  await second.getByRole("button", { name: "恢复选项", exact: true }).click();
  await second
    .getByRole("button", { name: "另存为冲突副本", exact: true })
    .click();
  await expect(second.getByText("已保存到本机", { exact: true })).toBeVisible();
  const copies = await disk(page);
  expect(copies).toHaveLength(2);
  expect(copies.find((x) => x.id !== original.id).layers.at(-1).name).toBe(
    "页面B的修改",
  );
  expect(copies.find((x) => x.id !== original.id).appId).not.toBe(
    original.appId,
  );
  // A stale tab can explicitly load the latest, without silently replacing its draft.
  await second.reload();
  await second
    .getByRole("button", { name: "打开 存储测试", exact: true })
    .click();
  await second.getByText("页面A的修改", { exact: true }).click();
  await page.getByLabel("图层名称").fill("页面A的新版本");
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  await second.getByLabel("图层名称").fill("待放弃的修改");
  await expect(second.getByRole("alert")).toContainText("其他页面已保存");
  await second
    .getByRole("button", { name: "加载已保存的最新版本", exact: true })
    .click();
  await expect(
    second.getByText("页面A的新版本", { exact: true }),
  ).toBeVisible();
  await expect(second.getByRole("alert")).toHaveCount(0);
});
test("quota failure preserves draft and export and can retry", async ({
  page,
}) => {
  await create(page);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    let fail = true;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if (args[1] === "readwrite" && fail) {
        fail = false;
        throw new DOMException("full", "QuotaExceededError");
      }
      return (original as any).apply(this, args);
    } as typeof original;
  });
  await page.getByLabel("图层名称").fill("配额失败后仍保留");
  await expect(page.getByRole("alert")).toContainText("存储空间不足");
  expect((await disk(page))[0].layers.at(-1).name).toBe("初始图层");
  await expect(page.getByLabel("图层名称")).toHaveValue("配额失败后仍保留");
  await page.getByRole("button", { name: "重试保存", exact: true }).click();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
  expect((await disk(page))[0].layers.at(-1).name).toBe("配额失败后仍保留");
});
