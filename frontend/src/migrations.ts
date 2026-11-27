import {migrateCompounds} from "./compound.ts";
import { defaultThresholds } from "./thresholds.ts";
import type { Project } from "./domain";
export const CURRENT_SCHEMA = 44;
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
  if (result.schemaVersion === 12) result = { ...result, schemaVersion: 13 };
  if (result.schemaVersion === 13) result = { ...result, schemaVersion: 14 };
  if (result.schemaVersion === 14) result = { ...result, schemaVersion: 15 };
  if (result.schemaVersion === 15) result = { ...result, schemaVersion: 16 };
  if (result.schemaVersion === 16) result = { ...result, schemaVersion: 17 };
  if (result.schemaVersion === 17) result = { ...result, schemaVersion: 18 };
  if (result.schemaVersion === 18) result = { ...result, schemaVersion: 19 };
  if (result.schemaVersion === 19) result = { ...result, schemaVersion: 20 };
  if (result.schemaVersion === 20) result = { ...result, schemaVersion: 21 };
  if (result.schemaVersion === 21) result = { ...result, schemaVersion: 22 };
  if (result.schemaVersion === 22) result = { ...result, schemaVersion: 23 };
  if (result.schemaVersion === 23) result = { ...result, schemaVersion: 24 };
  if (result.schemaVersion === 24) result = { ...result, schemaVersion: 25 };
  if(result.schemaVersion===25)result={...migrateCompounds(result),schemaVersion:26};
  if(result.schemaVersion===26)result={...result,schemaVersion:27};
  if(result.schemaVersion===27)result={...result,schemaVersion:28};
  if(result.schemaVersion===28)result={...result,schemaVersion:29};
  if(result.schemaVersion===29)result={...result,schemaVersion:30};
  if(result.schemaVersion===30)result={...result,schemaVersion:31};
  if(result.schemaVersion===31)result={...result,schemaVersion:32};
  if(result.schemaVersion===32)result={...result,schemaVersion:33};
  if(result.schemaVersion===33)result={...result,schemaVersion:34};
  if(result.schemaVersion===34)result={...result,schemaVersion:35};
  if(result.schemaVersion===35)result={...result,schemaVersion:36};
  if(result.schemaVersion===36)result={...result,schemaVersion:37};
  if(result.schemaVersion===37)result={...result,schemaVersion:38};
  if(result.schemaVersion===38)result={...result,schemaVersion:39,controls:result.controls?.map(c=>c.type==="dataSource"?{...c,legacySourceOptions:c.legacySourceOptions||c.options?.slice()}:c)};
  if(result.schemaVersion===39)result={...result,schemaVersion:40};
  if(result.schemaVersion===40)result={...result,schemaVersion:41};
  if(result.schemaVersion===41)result={...result,schemaVersion:42};
  if(result.schemaVersion===42)result={...result,schemaVersion:43};
  if(result.schemaVersion===43)result={...result,schemaVersion:44};
  if (!Array.isArray(result.layers) || !Array.isArray(result.versions))
    throw Error("项目图层或历史格式不正确");
  return result;
}
