import { uid, type Project } from "./domain";
type Asset = { id: string; hash: string; data: string; refCount: number };
type Reference = { id: string; projectId: string; assetId: string };
type Node = Record<string, any>;
type Pending = { id?: string; callbacks: ((id: string) => void)[] };
export type AssetCache = Map<string, Pending>;
function walk(value: any, visit: (node: Node) => void) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value)) visit(value);
  for (const child of Object.values(value))
    if (child && typeof child === "object") walk(child, visit);
}
function hash(data: string) {
  let a = 2166136261,
    b = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b ^ c, 2246822519);
  }
  return (a >>> 0).toString(16) + (b >>> 0).toString(16) + "-" + data.length;
}
function guarded(fail: (error: unknown) => void, action: () => void) {
  return () => {
    try {
      action();
    } catch (error) {
      fail(error);
    }
  };
}
function references(
  tx: IDBTransaction,
  projectId: string,
  ids: Set<string>,
  fail: (error: unknown) => void,
  done: () => void,
) {
  const refs = tx.objectStore("assetRefs"),
    assets = tx.objectStore("assets"),
    request = refs.index("projectId").getAll(projectId);
  request.onsuccess = guarded(fail, () => {
    const old = request.result as Reference[],
      touched = new Set([...old.map((r) => r.assetId), ...ids]);
    for (const r of old) refs.delete(r.id);
    for (const assetId of ids)
      refs.put({ id: projectId + ":" + assetId, projectId, assetId });
    for (const id of touched) {
      const count = refs.index("assetId").count(id);
      count.onsuccess = guarded(fail, () => {
        if (count.result === 0) {
          assets.delete(id);
          return;
        }
        const r = assets.get(id);
        r.onsuccess = guarded(fail, () => {
          const asset = r.result as Asset | undefined;
          if (!asset) throw Error("素材引用不完整，请保留设计并导出备份");
          if (asset.refCount !== count.result)
            assets.put({ ...asset, refCount: count.result });
        });
      });
    }
    done();
  });
}
export function writeStoredProject(
  tx: IDBTransaction,
  project: Project,
  fail: (error: unknown) => void,
  cache: AssetCache = new Map(),
) {
  const stored = structuredClone(project) as Node,
    groups = new Map<string, { node: Node; field: string }[]>(),
    ids = new Set<string>();
  walk(stored, (node) => {
    for (const field of ["image", "data"])
      if (
        typeof node[field] === "string" &&
        node[field].startsWith("data:image/")
      ) {
        const locations = groups.get(node[field]) || [];
        locations.push({ node, field });
        groups.set(node[field], locations);
      }
  });
  let pending = groups.size;
  const finish = () =>
    references(tx, project.id, ids, fail, () =>
      tx.objectStore("projects").put(stored),
    );
  if (!pending) {
    finish();
    return;
  }
  for (const [data, locations] of groups) {
    const resolved = (id: string) => {
      for (const { node, field } of locations) {
        delete node[field];
        node[field + "AssetStorageId"] = id;
      }
      ids.add(id);
      if (--pending === 0) finish();
    };
    const prior = cache.get(data);
    if (prior) {
      if (prior.id) resolved(prior.id);
      else prior.callbacks.push(resolved);
      continue;
    }
    const entry: Pending = { callbacks: [resolved] };
    cache.set(data, entry);
    const assets = tx.objectStore("assets"),
      key = hash(data),
      request = assets.index("hash").getAll(key);
    request.onsuccess = guarded(fail, () => {
      const existing = (request.result as Asset[]).find(
        (asset) => asset.data === data,
      );
      const id = existing?.id || uid();
      if (!existing) assets.put({ id, hash: key, data, refCount: 0 });
      entry.id = id;
      for (const callback of entry.callbacks) callback(id);
      entry.callbacks = [];
    });
  }
}
export function deleteStoredProject(
  tx: IDBTransaction,
  id: string,
  fail: (error: unknown) => void,
) {
  references(tx, id, new Set(), fail, () =>
    tx.objectStore("projects").delete(id),
  );
}
export function hydrateProject(
  stored: Project,
  assets: Map<string, Asset>,
): Project {
  const project = structuredClone(stored);
  walk(project, (node) => {
    for (const field of ["image", "data"]) {
      const id = node[field + "AssetStorageId"];
      if (id) {
        const asset = assets.get(id);
        if (!asset) throw Error("本地素材缺失，请不要覆盖项目并尝试恢复备份");
        node[field] = asset.data;
        delete node[field + "AssetStorageId"];
      }
    }
  });
  return project;
}
export function upgradeAssets(
  tx: IDBTransaction,
  fail: (error: unknown) => void,
) {
  const request = tx.objectStore("projects").getAll(),
    cache: AssetCache = new Map();
  request.onsuccess = guarded(fail, () => {
    for (const project of request.result)
      writeStoredProject(tx, project, fail, cache);
  });
}
