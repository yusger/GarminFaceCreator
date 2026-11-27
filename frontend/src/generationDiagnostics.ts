import {chartSizeWarning} from "./charts.ts";
import {primitiveSampling,CURVE_ERROR_PX} from "./primitiveSampling.ts";
import { deviceMetadata, deviceMetadataVersion } from "./deviceMetadata.ts";
import type { Layer, Project } from "./domain.ts";
import { capabilityCatalog, localLayerDiagnostics } from "./capabilities.ts";
import { expandWidgets, expandedChildren } from "./compound.ts";
import { resolveControls, validateControls } from "./projectControls.ts";

export type GenerationDiagnostic = {
  code: string;
  status: "unsupported" | "unverified" | "approximation";
  layerId?: string;
  target?: string;
  mode?: "active" | "aod" | "both";
  capabilityId?: string;
  path: string;
  message: string;
};

// Every selectable source is compiled, including choices that are not currently selected.
export function localConfigurationDiagnostics(
  p: Project,
): GenerationDiagnostic[] {
  const issues: GenerationDiagnostic[] = [];
  for (const c of p.controls || []) {
    if (c.type !== "dataSource") continue;
    for (const source of c.options || []) {
      const variant = resolveControls({
        ...p,
        controlValues: { ...p.controlValues, [c.id]: source },
      });
      for (const t of c.targets) {
        const l = variant.layers.find(
          (l) => l.id === t.layerId && l.exportIncluded !== false,
        );
        if (!l) continue;
        for (const d of localLayerDiagnostics(l))
          issues.push({
            ...d,
            code: "LOCAL_CONFIGURATION_UNSUPPORTED",
            path: `controls/${c.id}/options/${source}`,
            message: `配置「${c.label}」选项 ${source}：${d.message}`,
          });
      }
    }
  }
  return issues;
}

export function generationDiagnostics(
  project: Project,
): GenerationDiagnostic[] {
  const issues: GenerationDiagnostic[] = [];
  const owners = new Map<string, string>();
  try {
    for (const l of project.layers)
      if (l.kind === "widget")
        for (const child of expandedChildren(l, project))
          owners.set(child.id, l.id);
    const expanded = expandWidgets(project);
    validateControls(expanded);
    const p = resolveControls(expanded,true);
    const included = p.layers.filter((l) => l.exportIncluded !== false);
    const add = (
      l: Layer,
      code: string,
      status: GenerationDiagnostic["status"],
      message: string,
    ) =>
      issues.push({
        code,
        status,
        layerId: l.id,
        path: `layers/${l.id}`,
        message,
      });
    for (const l of included) {
      issues.push(...localLayerDiagnostics(l));
      if(l.kind==="chart"){
        if(included.filter(v=>v.kind==="chart").length>4 || !["venu445mm","venu441mm"].includes(p.target||"venu445mm"))add(l,"CHART_TARGET_BUDGET","unsupported","历史图表仅支持Venu4两尺寸，每表盘最多4个");
        const warning=chartSizeWarning(l);if(warning)add(l,"CHART_READABILITY","unverified",warning);
        add(l,"CHART_DEMO_HISTORY","unverified","网页历史为示意样例；原生历史可缺失，需检查实际覆盖率。AOD仅最近亮屏快照。");
      }
      if(["circle","rect"].includes(l.kind)){
        const sampling=primitiveSampling(l,(deviceMetadata(p.target||"venu445mm")?.width||454)/454);
        if(sampling.capped)add(l,"CURVE_SUBDIVISION_BUDGET","approximation",`曲线达到顶点预算，弦线误差上界约${sampling.errorPx.toFixed(2)}像素（目标${CURVE_ERROR_PX}）；尚未计入设备像素取整。`);
      }
      if (l.effectPrompt?.trim())
        add(
          l,
          "LOCAL_EFFECT_PROMPT",
          "unsupported",
          "原生效果说明需要AI工程实现；本地生成不会执行这段说明。",
        );
      if (
        [
          "text",
          "time",
          "date",
          "metric",
          "arcText",
          "calendar",
          "wordTime",
        ].includes(l.kind) &&
        !l.customFont
      )
        add(
          l,
          "SYSTEM_FONT_APPROXIMATION",
          "approximation",
          "网页使用替代字体；设备字体的字形、字号与排版需要原生核对。",
        );
      if (
        l.kind === "ring" &&
        l.ringStyle === "continuous" &&
        Math.abs(l.w - l.h) > 0.01
      )
        add(
          l,
          "ELLIPTICAL_ARC_APPROXIMATION",
          "approximation",
          "非正圆连续轨道采用分片近似，暗色轨道可能出现接缝。",
        );
      if (
        l.kind === "arcText" &&
        (!capabilityCatalog.rules.arcText.targets.includes(
          p.target || "venu445mm",
        ) ||
          included.filter((x) => x.kind === "arcText").length >
            capabilityCatalog.rules.arcText.maxLayers)
      )
        add(
          l,
          "LOCAL_ARC_TEXT_TARGET_BUDGET",
          "unsupported",
          "本地曲线文字仅开放Venu4两尺寸，且最多8层。",
        );
    }
    issues.push(...localConfigurationDiagnostics(expanded));
  } catch (e) {
    issues.push({
      code: "DESIGN_CONFIGURATION_INVALID",
      status: "unsupported",
      path: "project",
      message: (e as Error).message,
    });
  }
  if (deviceMetadata(project.target || "venu445mm")?.status !== "sdk-package")
    issues.push({
      code: "DEVICE_METADATA_UNKNOWN",
      status: "unverified",
      path: "target",
      message: "当前目标没有SDK设备包元数据，能力和预算保持待验证。",
    });
  issues.push({
    code: "DEVICE_VERIFICATION_PENDING",
    status: "unverified",
    path: "target",
    message:
      "生成映射检查不代表真机验证；目标设备显示、AOD切换和功耗仍需单独验收。",
  });
  const seen = new Set<string>();
  return issues
    .map((d) => ({
      ...d,
      layerId: d.layerId ? owners.get(d.layerId) || d.layerId : undefined,
      target: project.target || "venu445mm",
      mode: "both" as const,
      capabilityId: d.capabilityId || "project." + d.code.toLowerCase(),
    }))
    .filter((d) => {
      const key = [d.code, d.layerId, d.path, d.message].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
