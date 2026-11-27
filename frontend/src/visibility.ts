import {validMetricValue,metricLimits} from "./metricFormat.ts";
export const visibilitySources=["heartRate","steps","battery","oxygenSaturation","phoneConnected","moveBarLevel","precipitationChance","windBearing"] as const;
import type { Layer } from "./domain";
export type VisibilityCondition = {
  source:(typeof visibilitySources)[number];
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxInclusive?: boolean;
  missingVisible?: boolean;
  aod?: "evaluate" | "show" | "hide";
};
export function validateVisibility(c: VisibilityCondition | undefined) {
  if (c === undefined) return;
  if (
    !c ||
    typeof c !== "object" ||
    Array.isArray(c) ||
    Object.keys(c).some(
      (k) =>
        ![
          "source",
          "min",
          "max",
          "minExclusive",
          "maxInclusive",
          "missingVisible",
          "aod",
        ].includes(k),
    ) ||
    !visibilitySources.includes(c.source) ||
    [c.min, c.max].some(
      (v) => v !== undefined && (!Number.isFinite(v) || v < 0 || v >= 1e12),
    ) ||
    [c.minExclusive, c.maxInclusive, c.missingVisible].some(
      (v) => v !== undefined && typeof v !== "boolean",
    ) ||
    (c.aod !== undefined && !["evaluate", "show", "hide"].includes(c.aod)) ||
    (c.min !== undefined &&
      c.max !== undefined &&
      (c.min > c.max ||
        (c.min === c.max && (c.minExclusive || !c.maxInclusive))))
  )
    throw Error("图层数据可见条件无效");
}
export function conditionVisible(
  c: VisibilityCondition | undefined,
  values: Record<string, unknown>,
  aod = false,
) {
  if (!c) return true;
  validateVisibility(c);
  if (aod && c.aod && c.aod !== "evaluate") return c.aod === "show";
  const v = values[c.source];
  if(typeof v!=="number"||!validMetricValue(c.source,v))
    return !!c.missingVisible;
  return (
    (c.min === undefined || (c.minExclusive ? v > c.min : v >= c.min)) &&
    (c.max === undefined || (c.maxInclusive ? v <= c.max : v < c.max))
  );
}
export function nativeVisibility(l: Layer, aod: boolean) {
  const c = l.visibility;
  if (!c) return "true";
  validateVisibility(c);
  if (aod && c.aod && c.aod !== "evaluate")
    return c.aod === "show" ? "true" : "false";
  const v = "data" + c.source,r=metricLimits[c.source]||{min:0},
    valid = `${v}!=null && ${v}==${v} && ${v}${r.exclusiveMin?">":">="}${r.min} && ${v}<1.0e12${r.max!==undefined?` && ${v}<=${r.max}`:""}`;
  const range = [
    c.min === undefined ? "true" : `${v}${c.minExclusive ? ">" : ">="}${c.min}`,
    c.max === undefined ? "true" : `${v}${c.maxInclusive ? "<=" : "<"}${c.max}`,
  ].join(" && ");
  return `((${valid}) ? (${range}) : ${c.missingVisible ? "true" : "false"})`;
}
