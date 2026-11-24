import { isReference } from "./builtins";
import type { Project, Profile } from "./domain";
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("garmin-face-creator", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("projects", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
export async function loadProjects(): Promise<Project[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects");
    const r = tx.objectStore("projects").getAll();
    r.onsuccess = () =>
      resolve(r.result.sort((a: Project, b: Project) => b.updated - a.updated));
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveProject(p: Project) {
  if (isReference(p)) throw Error("内置参考项目不可覆盖，请创建副本");
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(p);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function removeProject(id: string) {
  if (isReference({ id })) throw Error("内置参考项目不可删除");
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
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
