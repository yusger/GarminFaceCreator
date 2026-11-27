import catalog from "../../resources/capabilities/editor-v1.json" with { type: "json" };
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
  if (l.rotation !== 0)
    add("LOCAL_ROTATION_UNSUPPORTED", "rotation", "当前本地生成不支持图层旋转");
  if (l.kind === "meter" && !catalog.rules.meterSources.includes(l.source))
    add("LOCAL_METER_SOURCE_UNSUPPORTED", "source", "进度控件仅支持步数或电量");
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
    projectSchemaVersion: catalog.projectSchemaVersion,
    deterministic: {
      rotation: 0,
      metricSources: localMetricSources,
      meterSources: catalog.rules.meterSources,
      heartRateMetricDecoration: false,
    },
    policy:
      "Editor design support and deterministic generation differ. Preserve requested known editable structure; do not silently flatten or drop it. Unsupported deterministic features need explicit later implementation or AI engineering; catalog is not device verification.",
  };
}
