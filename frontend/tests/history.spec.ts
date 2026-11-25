import { test, expect } from "@playwright/test";
import { project } from "../src/domain";
import {
  retainHistory,
  activeVersion,
  addCodeVersion,
  checkHistory,
} from "../src/history";
test("history limits preserve pinned and active snapshots and reject protected overflow", () => {
  const p = project();
  p.versions = Array.from({ length: 25 }, (_, i) => ({
    id: "v" + i,
    pinned: i === 0,
    at: i,
    revision: i,
    files: [{ path: "source/App.mc", content: "// version " + i }],
  }));
  p.files = p.versions[24].files;
  p.activeCodeVersion = "v24";
  const retained = retainHistory(p);
  expect(retained.versions).toHaveLength(20);
  expect(retained.versions[0].id).toBe("v0");
  expect(activeVersion(retained)).toBe("v24");
  const allPinned = {
    ...p,
    versions: p.versions.map((v) => ({ ...v, pinned: true })),
  };
  expect(() => retainHistory(allPinned)).toThrow(/20/);
  expect(allPinned.versions).toHaveLength(25);
  const large = {
    ...p,
    versions: [
      {
        id: "large",
        pinned: true,
        at: 0,
        revision: 0,
        files: [
          { path: "source/App.mc", content: "x".repeat(11 * 1024 * 1024) },
        ],
      },
    ],
  };
  expect(() => checkHistory(large)).toThrow(/10MB/);
  expect(
    addCodeVersion(retained, [{ path: "source/App.mc", content: "// new" }])
      .versions,
  ).toHaveLength(20);
});
test("legacy history remains readable and can be reduced without deleting active or pinned code", async ({
  page,
}) => {
  const p = project("历史测试");
  p.versions = Array.from({ length: 25 }, (_, i) => ({
    id: "v" + i,
    pinned: i === 0,
    at: i,
    revision: i,
    files: [{ path: "source/App.mc", content: "// version " + i }],
  }));
  p.files = p.versions[24].files;
  p.activeCodeVersion = "v24";
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
  await page.getByRole("button", { name: "我的表盘", exact: true }).click();
  await page
    .getByRole("button", { name: "打开 历史测试", exact: true })
    .click();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await page
    .getByRole("button", { name: "清理超限的未固定历史", exact: true })
    .click();
  await expect(page.locator(".history")).toContainText("20/20");
  await expect(
    page.getByLabel("删除代码版本 1", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("删除代码版本 20", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("已保存到本机", { exact: true })).toBeVisible();
});
