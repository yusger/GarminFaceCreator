import type { Layer, Project } from "./domain";
import { imageAssetPath } from "./assets";
type Omitted =
  | "image"
  | "assetId"
  | "hidden"
  | "locked"
  | "anchor"
  | "guide"
  | "groupId"
  | "groupName"
  | "exportIncluded"
  | "libraryIcon"
  | "weatherIcon"
  | "thresholdRules";
// Adding a Layer field requires an explicit protocol decision here (compile-time complete key coverage).
const fields: Record<Exclude<keyof Layer, Omitted>, true> = {
  id: true,
  name: true,
  kind: true,
  x: true,
  y: true,
  w: true,
  h: true,
  color: true,
  size: true,
  rotation: true,
  text: true,
  source: true,
  aod: true,
  threshold: true,
  strokeWidth: true,
  textAlign: true,
  fontWeight: true,
  garminFont: true,
  label: true,
  unit: true,
  precision: true,
  missingValue: true,
  allowClip: true,
  thresholdFallback: true,
  ringTicks: true,
  ringStart: true,
  ringEnd: true,
  ringWidth: true,
  ringSource: true,
  ringGoal: true,
  ringDim: true,
  aodColor: true,
  aodSize: true,
  aodSeconds: true,
  fillEnabled: true,
  strokeEnabled: true,
  strokeColor: true,
  opacity: true,
  cornerRadius: true,
};
function scalar(value: unknown) {
  if (value === undefined) return undefined;
  if (
    !["string", "number", "boolean"].includes(typeof value) ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    throw Error("画布字段格式无效，请检查数值或重新导入项目。");
  return value;
}
function objectFields(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("画布配置格式无效");
  const o = value as Record<string, unknown>;
  return Object.fromEntries(keys.map((key) => [key, scalar(o[key])]));
}
export function generationLayer(l: Layer) {
  const result = Object.fromEntries(
    Object.keys(fields).map((key) => [key, scalar(l[key as keyof Layer])]),
  );
  return {
    ...result,
    hidden: false,
    asset: l.image && !l.weatherIcon ? imageAssetPath(l) : undefined,
    libraryIcon: l.libraryIcon
      ? objectFields(l.libraryIcon, ["id", "recolor", "strokeWidth"])
      : undefined,
    weatherIcon: l.weatherIcon
      ? objectFields(l.weatherIcon, ["period"])
      : undefined,
    thresholdRules:
      l.thresholdRules === undefined
        ? undefined
        : (() => {
            if (!Array.isArray(l.thresholdRules))
              throw Error("阈值配置格式无效");
            return l.thresholdRules.map((rule) =>
              objectFields(rule, ["min", "max", "color"]),
            );
          })(),
  };
}
export function generationHeader(p: Project) {
  return {
    schemaVersion: scalar(p.schemaVersion),
    appId: scalar(p.appId),
    name: scalar(p.name),
    revision: scalar(p.revision),
    layoutGuide: p.layoutGuide
      ? objectFields(p.layoutGuide, [
          "presetId",
          "safeInsetPx",
          "minFontPx",
          "numberFontPx",
        ])
      : undefined,
  };
}
