import { binaryAssets } from "./assets";
import {
  uid,
  type Project,
  type CodeFile,
  type CodeProvenance,
} from "./domain";
export const HISTORY_MAX_COUNT = 20;
export const HISTORY_MAX_BYTES = 10 * 1024 * 1024;
export function normalizeHistory(p: Project): Project {
  return {
    ...p,
    versions: p.versions.map((v, i) => ({
      ...v,
      id: v.id || `legacy-${v.at}-${i}`,
    })),
  };
}
export function activeVersion(p: Project): string | undefined {
  if (
    p.activeCodeVersion &&
    p.versions.some((v) => v.id === p.activeCodeVersion)
  )
    return p.activeCodeVersion;
  return [...p.versions]
    .reverse()
    .find((v) => JSON.stringify(v.files) === JSON.stringify(p.files))?.id;
}
export function historyBytes(p: Project) {
  return new TextEncoder().encode(
    JSON.stringify(p.versions, (key, value) =>
      key === "data" &&
      typeof value === "string" &&
      value.startsWith("data:image/")
        ? undefined
        : value,
    ),
  ).length;
}
export function checkHistory(p: Project) {
  if (
    p.versions.length > HISTORY_MAX_COUNT ||
    historyBytes(p) > HISTORY_MAX_BYTES
  )
    throw Error(
      "代码历史超过 20 个或 10MB 上限，请导出备份后清理未固定历史；当前工作和固定版本不会自动删除。",
    );
}
export function retainHistory(p: Project): Project {
  let next = normalizeHistory(p);
  const current = activeVersion(next);
  while (
    next.versions.length > HISTORY_MAX_COUNT ||
    historyBytes(next) > HISTORY_MAX_BYTES
  ) {
    const candidate = next.versions
      .filter((v) => !v.pinned && v.id !== current)
      .sort((a, b) => a.at - b.at)[0];
    if (!candidate) {
      checkHistory(next);
      break;
    }
    next = {
      ...next,
      versions: next.versions.filter((v) => v.id !== candidate.id),
    };
  }
  return { ...next, activeCodeVersion: current };
}
export function addCodeVersion(
  p: Project,
  files: CodeFile[],
  provenance: CodeProvenance = { primary: "ai" },
): Project {
  // Preserve even legacy/reference working code before replacing its generation mode.
  const previous =
    p.files.length && !activeVersion(p)
      ? [
          {
            id: uid(),
            at: Date.now() - 1,
            revision: p.codeRevision,
            files: p.files,
            assets: binaryAssets(p),
            provenance: p.codeProvenance || { primary: "unknown" as const },
          },
        ]
      : [];
  const id = uid();
  return retainHistory({
    ...p,
    files,
    codeProvenance: provenance,
    codeRevision: p.revision,
    activeCodeVersion: id,
    versions: [
      ...p.versions,
      ...previous,
      {
        id,
        provenance,
        at: Date.now(),
        revision: p.revision,
        files,
        assets: binaryAssets(p),
      },
    ],
  });
}
