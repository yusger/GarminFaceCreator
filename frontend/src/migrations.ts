import { defaultThresholds } from "./thresholds.ts";
import type { Project } from "./domain";
export const CURRENT_SCHEMA = 12;
export function migrateProject(value: unknown): Project {
  if (!value || typeof value !== "object") throw Error("项目格式不正确");
  const input = value as Project;
  if (
    !Number.isInteger(input.schemaVersion) ||
    input.schemaVersion < 1 ||
    input.schemaVersion > CURRENT_SCHEMA
  )
    throw Error("不支持的项目版本，请使用兼容版本导入；不会覆盖现有项目。");
  let result = structuredClone(input);
  // Migrations are sequential and keep existing layer IDs/native resource paths intact.
  if (result.schemaVersion === 1) {
    if (!Array.isArray(result.layers)) throw Error("项目图层格式不正确");
    result = {
      ...result,
      schemaVersion: 2,
      layers: result.layers.map((l, i) => ({
        ...l,
        ...(l.image
          ? {
              assetId:
                l.assetId ||
                (/^[a-zA-Z0-9_-]{1,120}$/.test(l.id)
                  ? l.id
                  : `legacy-image-${i}`),
            }
          : {}),
      })),
      assets: result.assets?.map((asset, index) => ({
        ...asset,
        id: asset.id || `legacy-resource-${index}`,
      })),
      designSnapshots: [],
    };
  }
  if (result.schemaVersion === 2) {
    const defaults = (l: Project["layers"][number]) => ({
      ...l,
      textAlign: l.textAlign || ("center" as const),
      fontWeight:
        l.fontWeight || ((l.kind === "time" ? 600 : 400) as 400 | 600),
      garminFont: l.garminFont || ("auto" as const),
      missingValue: l.missingValue ?? "--",
      allowClip:
        l.allowClip ??
        ["ring", "circle", "image", "rect", "line"].includes(l.kind),
    });
    result = {
      ...result,
      schemaVersion: 3,
      layers: result.layers.map(defaults),
      designSnapshots: result.designSnapshots?.map((snapshot) => ({
        ...snapshot,
        layers: snapshot.layers.map(defaults),
      })),
    };
  }
  if (result.schemaVersion === 3) {
    const defaults = (l: Project["layers"][number]) => ({
      ...l,
      thresholdFallback: l.thresholdFallback || l.color,
      thresholdRules: l.thresholdRules ?? defaultThresholds(l.source, l.color),
      aodColor: l.aodColor || "#777777",
      aodSize: l.aodSize || l.size,
      aodSeconds: l.aodSeconds || ("zero" as const),
    });
    result = {
      ...result,
      schemaVersion: 4,
      layers: result.layers.map(defaults),
      designSnapshots: result.designSnapshots?.map((snapshot) => ({
        ...snapshot,
        layers: snapshot.layers.map(defaults),
      })),
    };
  }
  if (result.schemaVersion === 4) result = { ...result, schemaVersion: 5 };
  if (result.schemaVersion === 5) {
    const defaults = (l: Project["layers"][number]) => ({
      ...l,
      exportIncluded: l.exportIncluded ?? !l.hidden,
      anchor: l.anchor || ("topLeft" as const),
    });
    result = {
      ...result,
      schemaVersion: 6,
      layers: result.layers.map(defaults),
      designSnapshots: result.designSnapshots?.map((snapshot) => ({
        ...snapshot,
        layers: snapshot.layers.map(defaults),
      })),
    };
  }
  if (result.schemaVersion === 6) {
    const defaults = (l: Project["layers"][number]) =>
      ["rect", "circle", "line"].includes(l.kind)
        ? {
            ...l,
            fillEnabled: l.fillEnabled ?? l.kind !== "line",
            strokeEnabled: l.strokeEnabled ?? l.kind === "line",
            opacity: l.opacity ?? 1,
          }
        : l;
    result = {
      ...result,
      schemaVersion: 7,
      layers: result.layers.map(defaults),
      designSnapshots: result.designSnapshots?.map((snapshot) => ({
        ...snapshot,
        layers: snapshot.layers.map(defaults),
      })),
    };
  }
  if (result.schemaVersion === 7) result = { ...result, schemaVersion: 8 };
  if (result.schemaVersion === 8 && Array.isArray(result.versions))
    result = {
      ...result,
      schemaVersion: 9,
      codeProvenance: result.codeProvenance || { primary: "unknown" },
      versions: result.versions.map((v) => ({
        ...v,
        provenance: v.provenance || { primary: "unknown" },
      })),
    };
  if (result.schemaVersion === 9) result = { ...result, schemaVersion: 10 };
  if (result.schemaVersion === 10) result = { ...result, schemaVersion: 11 };
  if (result.schemaVersion === 11) {
    const defaults = (l: Project["layers"][number]) =>
      l.kind === "time"
        ? { ...l, timePart: l.timePart || ("full" as const) }
        : l;
    result = {
      ...result,
      schemaVersion: 12,
      layers: result.layers.map(defaults),
      designSnapshots: result.designSnapshots?.map((s) => ({
        ...s,
        layers: s.layers.map(defaults),
      })),
    };
  }
  if (!Array.isArray(result.layers) || !Array.isArray(result.versions))
    throw Error("项目图层或历史格式不正确");
  return result;
}
