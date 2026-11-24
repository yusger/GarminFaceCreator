import { uid, type Project, type DesignSnapshot } from "./domain";
export function checkDesignHistory(p: Project) {
  const snapshots = p.designSnapshots || [];
  if (
    snapshots.length > 10 ||
    new TextEncoder().encode(
      JSON.stringify(snapshots, (key, value) =>
        ["image", "data"].includes(key) &&
        typeof value === "string" &&
        value.startsWith("data:image/")
          ? undefined
          : value,
      ),
    ).length >
      20 * 1024 * 1024
  )
    throw Error("设计快照超过 10 个或 20MB 上限，请导出备份后清理未固定快照。");
}
export function retainDesignHistory(p: Project): Project {
  let snapshots = [...(p.designSnapshots || [])];
  while (true) {
    try {
      checkDesignHistory({ ...p, designSnapshots: snapshots });
      break;
    } catch (error) {
      const candidate = snapshots
        .filter((s) => !s.pinned && s.id !== p.activeDesignSnapshot)
        .sort((a, b) => a.at - b.at)[0];
      if (!candidate) throw error;
      snapshots = snapshots.filter((s) => s.id !== candidate.id);
    }
  }
  return { ...p, designSnapshots: snapshots };
}
export function saveDesignSnapshot(p: Project, name: string): Project {
  const snapshot: DesignSnapshot = {
    id: uid(),
    name,
    at: Date.now(),
    layers: structuredClone(p.layers),
    assets: structuredClone(p.assets),
    target: p.target,
    deviceSize: p.deviceSize,
  };
  return retainDesignHistory({
    ...p,
    activeDesignSnapshot: snapshot.id,
    designSnapshots: [...(p.designSnapshots || []), snapshot],
  });
}
export function restoreDesignSnapshot(p: Project, id: string): Project {
  const snapshot = p.designSnapshots?.find((s) => s.id === id);
  if (!snapshot) throw Error("设计快照不存在");
  return {
    ...p,
    layers: structuredClone(snapshot.layers),
    assets: structuredClone(snapshot.assets),
    target: snapshot.target,
    deviceSize: snapshot.deviceSize,
    activeDesignSnapshot: id,
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
}
