import { isReference } from "./builtins";
import type { Project, Profile } from "./domain";
export class StorageConflict extends Error {
  constructor() {
    super("其他页面已保存此项目，当前修改尚未覆盖已保存版本。");
  }
}
export function storageMessage(error: unknown): string {
  const e = error as DOMException;
  if (e?.name === "QuotaExceededError")
    return "浏览器存储空间不足，请导出备份或清理空间后重试。";
  if (e?.name === "AbortError")
    return "存储事务已中止，当前修改仍保留在页面中。";
  return e?.message || "浏览器存储不可用，请导出备份后重试。";
}
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const req = indexedDB.open("garmin-face-creator", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("projects", { keyPath: "id" });
    req.onsuccess = () => {
      if (settled) {
        req.result.close();
        return;
      }
      settled = true;
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => {
      settled = true;
      reject(req.error);
    };
    req.onblocked = () => {
      settled = true;
      reject(Error("数据库升级被其他页面阻止，请关闭旧页面后重试。"));
    };
  });
function transaction(db: IDBDatabase, mode: IDBTransactionMode = "readonly") {
  try {
    return db.transaction("projects", mode);
  } catch (error) {
    db.close();
    throw error;
  }
}
export async function loadProjects(): Promise<Project[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = transaction(db);
    const r = tx.objectStore("projects").getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(r.result.sort((a: Project, b: Project) => b.updated - a.updated));
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error || Error("读取事务已中止"));
    };
  });
}
export async function saveProject(
  p: Project,
  baseStorageVersion = p.storageVersion ?? 0,
): Promise<number> {
  if (isReference(p)) throw Error("内置参考项目不可覆盖，请创建副本");
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = transaction(db, "readwrite");
    const store = tx.objectStore("projects");
    let conflict = false;
    let next = 0;
    const r = store.get(p.id);
    r.onsuccess = () => {
      if (
        (r.result?.storageVersion ?? 0) !== baseStorageVersion ||
        (!r.result && baseStorageVersion !== 0)
      ) {
        conflict = true;
        tx.abort();
        return;
      }
      next = baseStorageVersion + 1;
      store.put({ ...p, storageVersion: next });
    };
    tx.oncomplete = () => {
      db.close();
      resolve(next);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        conflict
          ? new StorageConflict()
          : tx.error || new DOMException("保存事务已中止", "AbortError"),
      );
    };
  });
}
export async function removeProject(id: string) {
  if (isReference({ id })) throw Error("内置参考项目不可删除");
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = transaction(db, "readwrite");
    tx.objectStore("projects").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error || Error("删除事务已中止"));
    };
  });
}
export function readProfiles(): Profile[] {
  try {
    return JSON.parse(localStorage.getItem("gfc-profiles") || "[]").map(
      (p: Profile) => ({
        ...p,
        key: p.remember
          ? p.key
          : sessionStorage.getItem("gfc-key-" + p.id) || "",
      }),
    );
  } catch {
    return [];
  }
}
export function storeProfiles(profiles: Profile[]) {
  localStorage.setItem(
    "gfc-profiles",
    JSON.stringify(
      profiles.map((p) => ({ ...p, key: p.remember ? p.key : "" })),
    ),
  );
  profiles.forEach((p) => {
    if (p.remember) sessionStorage.removeItem("gfc-key-" + p.id);
    else sessionStorage.setItem("gfc-key-" + p.id, p.key);
  });
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
