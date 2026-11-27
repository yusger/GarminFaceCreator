import {validateChart} from "./charts.ts";
import {GENERATION_FIELD_CONTRACT_VERSION} from "./generationFields.ts";
import catalog from "../../resources/capabilities/editor-v1.json" with { type: "json" };
import { sourceContractVersion } from "./sourceAdapters.ts";
import type { Layer } from "./domain";
export const capabilityCatalog = catalog;
export const capabilityVersion = catalog.version;
export const createKinds = catalog.entries
  .filter((e) => e.kind && e.aiCreate)
  .map((e) => e.kind!);
export const chatKinds = catalog.entries
  .filter((e) => e.kind && e.chatAdd)
  .map((e) => e.kind!);
export const localKinds = catalog.entries
  .filter((e) => e.kind && e.kind !== "widget" && e.deterministic)
  .map((e) => e.kind!);
export const localMetricSources = catalog.entries
  .filter((e) => e.source && e.deterministic)
  .map((e) => e.source!);
export type CapabilityDiagnostic = {
  code: string;
  status: "unsupported" | "unverified";
  layerId: string;
  capabilityId: string;
  path: string;
  message: string;
};
export function localLayerDiagnostics(l: Layer): CapabilityDiagnostic[] {
  const issues: CapabilityDiagnostic[] = [];
  const add = (code: string, field: string, message: string) =>
    issues.push({
      code,
      status: "unsupported",
      layerId: l.id,
      capabilityId: "core." + l.kind,
      path: "layers/" + l.id + "/" + field,
      message,
    });
  if (
    !localKinds.includes(l.kind) ||
    (l.kind === "image" && !(l.libraryIcon || l.image))
  )
    add(
      "LOCAL_KIND_UNSUPPORTED",
      "kind",
      "控件类型或图片资源未获当前本地生成器支持",
    );
  if (l.rotation !== 0 && !catalog.rules.rotatedKinds.includes(l.kind))
    add(
      "LOCAL_ROTATION_UNSUPPORTED",
      "rotation",
      "当前本地生成仅支持rect/line/circle/polygon旋转",
    );
  if(l.kind==="chart"){try{validateChart(l);}catch(e){add("LOCAL_CHART_INVALID","chart",(e as Error).message);}}
  if (l.kind === "arcText") {
    if (
      l.text.length > catalog.rules.arcText.maxChars ||
      /[^\x20-\x7e]/.test(l.text) ||
      l.customFont ||
      (l.garminFont && !["auto", "small"].includes(l.garminFont)) ||
      (l.fontWeight ?? 400) !== 400 ||
      (l.opacity ?? 1) !== 1
    )
      add(
        "LOCAL_ARC_TEXT_STYLE_UNSUPPORTED",
        "text",
        "曲线文字暂仅支持80字内ASCII、设备矢量小号字体、常规字重和不透明颜色",
      );
    const sizes = [l.size, ...(l.aod ? [l.aodSize || l.size] : [])];
    if (
      sizes.some(
        (size) =>
          size < 6 ||
          size > 80 ||
          l.text.length * size +
            Math.max(0, l.text.length - 1) * (l.arcSpacing ?? 0) >
            2 * Math.PI * Math.min(l.w, l.h) * (l.arcRadius ?? 0.4),
      )
    )
      add(
        "LOCAL_ARC_TEXT_BUDGET",
        "size",
        "曲线字号须6–80，文字按保守预算限一圈；请缩字、加半径或减少文字",
      );
  }
  if (l.kind === "meter" && !catalog.rules.meterSources.includes(l.source))
    add("LOCAL_METER_SOURCE_UNSUPPORTED", "source", "进度控件仅支持步数、电量、血氧或久坐等级");
  if (l.kind === "metric" && !localMetricSources.includes(l.source))
    add(
      "LOCAL_METRIC_SOURCE_UNSUPPORTED",
      "source",
      "该数据源尚未接入本地生成器",
    );
  if (
    l.kind === "metric" &&
    l.source === "heartRate" &&
    l.metricDecoration !== false
  )
    add(
      "LOCAL_HEART_DECORATION_UNSUPPORTED",
      "metricDecoration",
      "本地心率需显式关闭装饰",
    );
  return issues;
}
export function designCapabilityContext() {
  return {
    catalogVersion: capabilityVersion,
    sourceContractVersion,
    generationFieldContractVersion:GENERATION_FIELD_CONTRACT_VERSION,
    projectSchemaVersion: catalog.projectSchemaVersion,
    deterministic: {
      rotation: {
        default: 0,
        supportedKinds: catalog.rules.rotatedKinds,
        pivot: "layer center",
        direction: "clockwise screen coordinates",
      },
      arcText: catalog.rules.arcText,
      bitmapFonts:catalog.rules.bitmapFonts,
      ringStyles: ["ticks", "continuous"],
      ringCaps: ["butt", "round"],
      ringAod: "dim track only; no seconds animation",
      visibility:{sources:catalog.rules.visibilitySources,semantics:"explicit per-layer numeric conditions; shared metric range validity; missing and AOD policy kept separate"},
      metricSources: localMetricSources,
      meterSources: catalog.rules.meterSources,
      heartRateMetricDecoration: false,
      autoSourceFormat:"Optional metric flag: derive ASCII label, display suffix and distance=2/temperature=1/others=0 precision from selected source; use numeric-only decoration. Manual formatting remains when flag is false. readoutSample is editor-only and must never become real sensor data.",
    },
    policy:
      "Editor design support and deterministic generation differ. Preserve requested known editable structure; do not silently flatten or drop it. Unsupported deterministic features need explicit later implementation or AI engineering; catalog is not device verification.",
  };
}
