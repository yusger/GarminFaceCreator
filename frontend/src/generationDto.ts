import { validateControls } from "./projectControls";
import { validateVisibility } from "./visibility";
import { meterPolygons } from "./meters";
import { defaultThresholds } from "./thresholds";
import type { Layer, Project } from "./domain";
import { imageAssetPath } from "./assets";
import {generationScalarFields as fields} from "./generationFields.ts";
import {validPolygon} from "./geometry.ts";
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
  if(l.kind==="widget")throw Error("复合控件必须先展开后生成工程");
  validateVisibility(l.visibility);
  if(l.kind==="polygon" && !validPolygon(l.polygonPoints))throw Error("多边形顶点格式无效");
  const rules =
    l.thresholdRules ??
    (l.kind === "metric" && l.threshold
      ? defaultThresholds(l.source, l.color)
      : undefined);
  const ringSource = l.ringSource || "seconds";

  const result = Object.fromEntries(
    Object.keys(fields).map((key) => [key, scalar(l[key as keyof Layer])]),
  );
  return {
    ...result,
    ...(l.handBitmap?{handBitmap:objectFields(l.handBitmap,["packId","setId","role","version"])}:{}),
    ...(l.handShape?{handShape:{...objectFields(l.handShape,["id","version"]),points:l.handShape.points.map(point=>point.map(scalar))}}:{}),
    ...(l.customFont
      ? { customFont: objectFields(l.customFont, ["id", "family", "file"]) }
      : {}),
    ...(l.visibility
      ? {
          visibility: objectFields(l.visibility, [
            "source",
            "min",
            "max",
            "minExclusive",
            "maxInclusive",
            "missingVisible",
            "aod",
          ]),
        }
      : {}),
    ...(l.kind === "time"
      ? {
          timePart: l.timePart || "full",
          timeClock:
            l.timeUtcOffset === undefined ? "deviceLocal" : "fixedUtcOffset",
          timeUtcOffset: l.timeUtcOffset,
          ...(l.timeUtcOffset === undefined ? {} : { automaticDst: false }),
        }
      : {}),
    textAlign: l.textAlign || "center",
    fontWeight: l.fontWeight || (l.kind === "time" ? 600 : 400),
    garminFont: l.garminFont || "auto",
    missingValue: l.missingValue ?? "--",
    aodColor: l.aodColor || "#777777",
    aodSize: l.aodSize || l.size,
    aodSeconds: l.aodSeconds || "zero",
    thresholdFallback: l.thresholdFallback || l.color,
    ...(["rect", "circle", "line", "polygon"].includes(l.kind)
      ? {
          ...(l.kind==="polygon"?{polygonPoints:l.polygonPoints!.map(([x,y])=>[x,y])}:{}),
          fillEnabled: l.fillEnabled ?? l.kind !== "line",
          strokeEnabled: l.strokeEnabled ?? l.kind === "line",
          strokeColor: l.strokeColor || l.color,
          strokeWidth: l.strokeWidth || 2,
          opacity: l.opacity ?? 1,
          ...(l.kind === "rect" ? { cornerRadius: l.cornerRadius ?? 4 } : {}),
        }
      : {}),
    ...(l.kind==="arcText"?{arcRadius:l.arcRadius??0.4,arcStartAngle:l.arcStartAngle??0,arcDirection:l.arcDirection||"clockwise",arcSpacing:l.arcSpacing??0,nativeFont:"scalable Graphics.FONT_SMALL; API5.1; Venu4 only; ASCII only"}:{}),
    ...(l.kind === "ring"
      ? {
          ringStyle:l.ringStyle||"ticks",
          ringCap:l.ringCap||"butt",
          ringTicks: l.ringTicks || 60,
          ringSource,
          ringGoal:
            ringSource === "static"
              ? 1
              : l.ringGoal ||
                { seconds: 60, steps: 10000, battery: 100, heartRate: 180 }[
                  ringSource
                ],
          ringStart: l.ringStart ?? 0,
          ringEnd: l.ringEnd ?? 360,
          ringWidth: l.ringWidth || 2,
          ringDim: l.ringDim ?? 0.25,
        }
      : {}),
    ...(l.kind === "meter"
      ? {
          meterShape: l.meterShape || "bar",
          meterCount: l.meterCount ?? 16,
          meterGoal: l.meterGoal ?? (l.source === "battery" ? 100 : 10000),
          meterDim: l.meterDim ?? 0.35,
          meterPolygons: meterPolygons(l),
        }
      : {}),
    ...(l.kind === "hand"
      ? {
          handType: l.handType || "hour",
          handPivotX: l.handPivotX ?? 0.5,
          handPivotY: l.handPivotY ?? 0.5,
          handReach: l.handReach ?? 0.58,
          handTail: l.handTail ?? 0.08,
          handClock: "deviceLocal",
        }
      : {}),
    ...(l.kind === "celestial"
      ? {
          solarPart: l.solarPart || "sky",
          solarNightColor:
            l.solarNightColor ||
            (l.solarPart === "body" ? "#dfedff" : "#0b1829"),
          solarMissingColor: l.solarMissingColor || "#17212c",
          solarDataPolicy: "cachedPositionGarminSunTimes",
          moonPolicy: "nightIndicatorNotMoonPhase",
        }
      : {}),
    ...(l.kind === "calendar"
      ? {
          calendarStart: l.calendarStart || "monday",
          calendarTodayColor: l.calendarTodayColor || "#70c7ff",
          calendarTodayText: l.calendarTodayText || "#07131d",
          calendarMutedColor: l.calendarMutedColor || "#586a7f",
          calendarHeaderColor: l.calendarHeaderColor || "#7891aa",
        }
      : {}),
    ...(l.kind === "wordTime"
      ? { wordLanguage: l.wordLanguage || "en", wordRow: l.wordRow || "all" }
      : {}),
    ...(l.kind === "metric"
      ? { metricDecoration: l.metricDecoration ?? true }
      : {}),
    hidden: false,
    asset: l.image && !l.weatherIcon ? imageAssetPath(l) : undefined,
    libraryIcon: l.libraryIcon
      ? objectFields(l.libraryIcon, ["id", "recolor", "strokeWidth"])
      : undefined,
    weatherIcon: l.weatherIcon
      ? objectFields(l.weatherIcon, ["period"])
      : undefined,
    thresholdRules:
      rules === undefined
        ? undefined
        : (() => {
            if (!Array.isArray(rules)) throw Error("阈值配置格式无效");
            return rules.map((rule) =>
              objectFields(rule, ["min", "max", "color"]),
            );
          })(),
  };
}
export function generationHeader(p: Project) {
  validateControls(p);
  return {
    schemaVersion: scalar(p.schemaVersion),
    designBrief: scalar(p.designBrief),
    backgroundColor: scalar(p.backgroundColor),
    controls: p.controls?.map((c) => ({
      ...objectFields(c, ["id", "label", "type", "default"]),
      options: c.options?.map(scalar),
      targets: c.targets.map((t) => objectFields(t, ["layerId", "property"])),
      hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.map(scalar),
    })),
    controlValues: p.controlValues
      ? Object.fromEntries(
          (p.controls || [])
            .filter((c) => p.controlValues?.[c.id] !== undefined)
            .map((c) => [c.id, scalar(p.controlValues![c.id])]),
        )
      : undefined,
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
