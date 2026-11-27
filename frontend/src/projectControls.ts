import {activeTheme,themeLayers} from "./themes.ts";
import { validateDataSlots, sourceSlotLayer,sourceSlotLabel } from "./dataSlots.ts";
import { metricDisplayUnits } from "./metricFormat.ts";
import type { Project, Layer } from "./domain.ts";
export type ControlTarget = {
  layerId: string;
  property:
    "color" | "activeVisible" | "source" | `thresholdRules.${number}.color`;
};
export type ProjectControl = {
  id: string;
  label: string;
  type: "color" | "boolean" | "dataSource";
  default: string | boolean;
  options?: string[];
  targets: ControlTarget[];
  hideWhenChangedFromDefault?: string[];
  slot?: true;
  sourceIcons?:Record<string,string[]>;
  sourceLabels?:Record<string,string>;
  sourceUnits?:Record<string,string>;
  sourcePrecisions?:Record<string,number>;
  sourceGoals?: Record<string,number>;
  preserveFormatFor?: string[];
};
export const sourceLabels: Record<string, string> = {
  heartRate: "bpm",
  steps: "steps",
  battery: "batt",
  calories: "kcal",
  distance: "km",
  temperature: "temp",
  seconds: "sec",
  stress: "stress",
  recoveryHours: "recovery",
  floorsClimbed: "floors",
  intensityMinutes: "active",
  humidity: "RH",
  uvIndex: "UV",
  altitude: "ALT",
  windSpeed: "WIND",
};
export const defaultPrecision = (source: string) =>
  source === "distance" ? 2 : source === "temperature" ? 1 : 0;
export function controlValue(p: Project, c: ProjectControl) {
  return p.controlValues?.[c.id] ?? c.default;
}
export function validateControls(p: Project) {
  validateDataSlots(p);
  const iconOwners=new Map<string,string>();
  const ids = new Set(p.layers.map((l) => l.id)),
    seen = new Set<string>(),
    targets = new Set<string>();
  if (
    p.backgroundColor !== undefined &&
    !/^#[a-f0-9]{6}$/i.test(p.backgroundColor)
  )
    throw Error("背景颜色无效");
  if (
    p.controls !== undefined &&
    (!Array.isArray(p.controls) || p.controls.length > 40)
  )
    throw Error("表盘配置无效");
  for (const c of p.controls || []) {
    if (
      !/^[a-z][a-z0-9-]{0,79}$/.test(c.id) ||
      seen.has(c.id) ||
      typeof c.label !== "string" ||
      !["color", "boolean", "dataSource"].includes(c.type) ||
      !Array.isArray(c.targets) ||
      !c.targets.length
    )
      throw Error("表盘配置定义无效");
    seen.add(c.id);
    if(c.sourcePrecisions!==undefined&&(c.type!=="dataSource"||!c.sourcePrecisions||Array.isArray(c.sourcePrecisions)||Object.entries(c.sourcePrecisions).some(([key,v])=>!c.options?.includes(key)||!Number.isInteger(v)||v<0||v>6)))throw Error("数据槽来源精度无效");
    for(const map of [c.sourceLabels,c.sourceUnits])if(map!==undefined&&(c.type!=="dataSource"||!map||typeof map!=="object"||Array.isArray(map)||Object.entries(map).some(([source,text])=>!c.options?.includes(source)||typeof text!=="string"||text.length>100)))throw Error("数据槽显示标签或后缀无效");
    if(c.sourceIcons!==undefined){
      if(c.type!=="dataSource"||!c.sourceIcons||typeof c.sourceIcons!=="object"||Array.isArray(c.sourceIcons))throw Error("来源图标映射无效");
      for(const [source,list] of Object.entries(c.sourceIcons)){
       if(!c.options?.includes(source)||!Array.isArray(list)||list.length>48||new Set(list).size!==list.length)throw Error("来源图标选项无效");
       for(const id of list){const icon=p.layers.find(l=>l.id===id);if(!icon||icon.kind!=="image"||icon.weatherIcon||c.hideWhenChangedFromDefault?.includes(id)||(iconOwners.has(id)&&iconOwners.get(id)!==c.id))throw Error("来源图标引用冲突或缺失");iconOwners.set(id,c.id);}
      }
    }
    if(c.type === "dataSource" && (!c.options || c.options.length>7 || new Set(c.options).size!==c.options.length)) throw Error("数据源配置选项须唯一且最多7项");
    const valid = (v: unknown) =>
      c.type === "boolean"
        ? typeof v === "boolean"
        : c.type === "color"
          ? typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v)
          : typeof v === "string" &&
            !!c.options?.includes(v) &&
            [
              "heartRate",
              "steps",
              "battery",
              "calories",
              "distance",
              "temperature",
              "seconds",
            ].includes(v);
    if (
      !valid(c.default) ||
      !valid(controlValue(p, c)) ||
      (c.type === "dataSource" &&
        (!c.options?.length ||
          c.options.some(
            (v) =>
              ![
                "heartRate",
                "steps",
                "battery",
                "calories",
                "distance",
                "temperature",
                "seconds",
              ].includes(v),
          )))
    )
      throw Error("表盘配置值无效");
    for (const t of c.targets) {
      const l = p.layers.find((l) => l.id === t.layerId),
        key = t.layerId + ":" + t.property;
      if (!l || targets.has(key)) throw Error("表盘配置目标缺失或重复");
      targets.add(key);
      if (
        c.type === "boolean"
          ? t.property !== "activeVisible"
          : c.type === "dataSource"
            ? t.property !== "source" || l.sourceLocked || !(l.kind === "metric" || (c.slot && ["meter","ring"].includes(l.kind)))
            : !(
                t.property === "color" ||
                /^thresholdRules\.\d+\.color$/.test(t.property)
              )
      )
        throw Error("表盘配置属性不允许");
      if (
        t.property.startsWith("thresholdRules.") &&
        !l.thresholdRules?.[Number(t.property.split(".")[1])]
      )
        throw Error("阈值配置引用无效");
    }
    for (const id of c.hideWhenChangedFromDefault || [])
      if (!ids.has(id)) throw Error("配置联动图层缺失");
  }
  if (
    p.controlValues &&
    (typeof p.controlValues !== "object" ||
      Array.isArray(p.controlValues) ||
      Object.keys(p.controlValues).some((id) => !seen.has(id)))
  )
    throw Error("未知表盘配置");
  for (const l of p.layers) {
    if (
      l.readoutSample !== undefined &&
      (l.kind !== "metric" ||
        typeof l.readoutSample !== "string" ||
        l.readoutSample.length > 48)
    )
      throw Error("最大读数样本仅限数据控件且最多48字");
    if (l.autoSourceFormat !== undefined && l.kind !== "metric")
      throw Error("自动数据格式仅限数据控件");
    if (
      l.customFont &&
      (!/^[a-zA-Z0-9_-]+$/.test(l.customFont.id) ||
        !/^[-a-zA-Z0-9_]+\.(ttf|otf)$/.test(l.customFont.file) ||
        typeof l.customFont.family !== "string")
    )
      throw Error("自定义字体无效");
    if(l.sourceLabelStyle!==undefined&&(!["unit","label","unitLabel"].includes(l.sourceLabelStyle)||l.kind!=="text"||!l.sourceLabelFor))throw Error("数据标签样式无效");
    if (l.sourceLabelFor && !ids.has(l.sourceLabelFor))
      throw Error("数据标签引用缺失");
    for (const key of [
      "activeVisible",
      "imageFullColor",
      "iconMask",
      "autoPrecision",
      "autoSourceFormat",
      "groupThousands",
      "meterContinuous",
    ] as const)
      if (l[key] !== undefined && typeof l[key] !== "boolean")
        throw Error("控件扩展属性无效");
    if(l.iconMask && (l.kind!=="image"||!l.image||l.libraryIcon||l.w>128||l.h>128))throw Error("单色图标仅支持128逻辑像素内的本地透明位图");
    if (l.dateFormat !== undefined && !["monthDayWeek","weekdayDay"].includes(l.dateFormat))
      throw Error("日期格式无效");
    if (l.meterContinuous && (l.kind !== "meter" || l.meterShape !== "bar"))
      throw Error("连续进度条仅支持横条");
    if (
      l.meterDimColor !== undefined &&
      !/^#[a-f0-9]{6}$/i.test(l.meterDimColor)
    )
      throw Error("进度底色无效");
    if (l.handCap !== undefined && !["round", "butt"].includes(l.handCap))
      throw Error("指针端帽无效");
  }
}
export function resolvedLayer(l: Layer, layers: Layer[], controls?:ProjectControl[]): Layer {
  const source = l.sourceLabelFor
    ? layers.find((x) => x.id === l.sourceLabelFor)?.source
    : undefined;
  return {
    ...l,
    ...(source ? { text: l.sourceLabelStyle?sourceSlotLabel(source,l.sourceLabelStyle):controls?.find(c=>c.type==="dataSource"&&c.targets.some(t=>t.layerId===l.sourceLabelFor))?.sourceLabels?.[source] || sourceLabels[source] || "--" } : {}),
    ...(l.autoPrecision ? { precision: defaultPrecision(l.source) } : {}),
    ...(l.kind === "metric" && l.autoSourceFormat
      ? {
          label: sourceLabels[l.source] || "",
          unit: metricDisplayUnits[l.source] || "",
          precision: defaultPrecision(l.source),
          metricDecoration: false,
        }
      : {}),
  };
}
export function resolveControls(p: Project,allThemes=false): Project {
  if (
    !p.themes && !p.controls?.length &&
    !p.layers.some(
      (l) => l.sourceLabelFor || l.autoPrecision || l.autoSourceFormat,
    )
  )
    return p;
  const layers = p.layers.map((l) => ({
    ...l,
    thresholdRules: l.thresholdRules?.map((r) => ({ ...r })),
  }));
  for (const c of p.controls || []) {
    const value = controlValue(p, c);
    for (const t of c.targets) {
      const l = layers.find((l) => l.id === t.layerId);
      if (!l) continue;
      if (t.property.startsWith("thresholdRules.")) {
        const rule = l.thresholdRules?.[Number(t.property.split(".")[1])];
        if (rule) rule.color = String(value);
      } else (l as unknown as Record<string, unknown>)[t.property] = value;
    }
  }
  for (const c of p.controls || [])
    if (controlValue(p, c) !== c.default)
      for (const id of c.hideWhenChangedFromDefault || []) {
        const l = layers.find((l) => l.id === id);
        if (l) { l.activeVisible = false; l.aod = false; }
      }
  for(const c of p.controls||[])if(c.sourceIcons){
    const visible=new Set(c.sourceIcons[String(controlValue(p,c))]||[]);
    for(const id of new Set(Object.values(c.sourceIcons).flat())){const icon=layers.find(l=>l.id===id);if(icon&&!visible.has(id)){icon.activeVisible=false;icon.aod=false;}}
  }
  const slotted=layers.map(l=>{
    const c=p.controls?.find(c=>c.slot && c.targets.some(t=>t.layerId===l.id && t.property==="source"));
    return c?sourceSlotLayer(p,l,c,String(controlValue(p,c))):l;
  });
  const resolved={ ...p, layers: slotted.map((l) => resolvedLayer(l, slotted,p.controls)),backgroundColor:allThemes?p.backgroundColor:activeTheme(p)?.backgroundColor||p.backgroundColor };
  return allThemes?resolved:{...resolved,layers:themeLayers(resolved)};
}
export function setControl(
  p: Project,
  id: string,
  value: string | boolean,
): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后修改表盘配置");
  const next: Project = {
    ...p,
    ...(p.multiDevice
      ? {
          multiDevice: {
            ...p.multiDevice,
            viewVersion: (p.multiDevice.viewVersion || 0) + 1,
            variants: p.multiDevice.variants.map((v) => ({
              ...v,
              revision: v.revision + 1,
              code: { ...v.code, codeRevision: -1 },
              buildId: undefined,
              buildStatus: undefined,
            })),
          },
        }
      : {}),
    controlValues: { ...p.controlValues, [id]: value },
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
  validateControls(next);
  return next;
}
export function remapControlIds(before: Project, after: Project) {
  const map = new Map(before.layers.map((l, i) => [l.id, after.layers[i].id]));
  const id = (v: string) => map.get(v) || v;
  if(before.themes)after.themes={...structuredClone(before.themes),presets:before.themes.presets.map(t=>({...t,layerIds:t.layerIds.map(id)}))};
  after.controls = before.controls?.map((c) => ({
    ...c,
    targets: c.targets.map((t) => ({ ...t, layerId: id(t.layerId) })),
    hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.map(id),
    ...(c.sourceIcons?{sourceIcons:Object.fromEntries(Object.entries(c.sourceIcons).map(([key,list])=>[key,list.map(id)]))}:{}),
    ...(c.preserveFormatFor?{preserveFormatFor:c.preserveFormatFor.map(id)}:{}),
  }));
  after.layers = after.layers.map((l) => ({
    ...l,
    ...(l.sourceLabelFor ? { sourceLabelFor: id(l.sourceLabelFor) } : {}),
  }));
}

export function setSourceIcon(p:Project,controlId:string,layerId:string,source:string|undefined):Project{
 const c=p.controls?.find(c=>c.id===controlId);if(!c||c.type!=="dataSource"||(source!==undefined&&!c.options?.includes(source)))throw Error("来源图标配置无效");
 const map=Object.fromEntries(Object.entries(c.sourceIcons||{}).map(([key,list])=>[key,list.filter(id=>id!==layerId)]));if(source)map[source]=[...(map[source]||[]),layerId];
 const next={...setControl(p,c.id,controlValue(p,c)),controls:p.controls!.map(x=>x.id===c.id?{...x,sourceIcons:map,hideWhenChangedFromDefault:x.hideWhenChangedFromDefault?.filter(id=>id!==layerId)}:x)};validateControls(next);return next;
}
export function resetControls(p: Project): Project {
  const first = p.controls?.[0];
  return first
    ? { ...setControl(p, first.id, first.default), controlValues: undefined }
    : p;
}

// An explicit alternative to inventing a replacement icon for an unrelated source.
export function setSourceDecoration(p:Project,controlId:string,layerId:string,enabled:boolean):Project {
  const c=p.controls?.find(c=>c.id===controlId),l=p.layers.find(l=>l.id===layerId);
  if(!c||c.type!=="dataSource"||!l||l.kind!=="image"||l.locked||l.weatherIcon||l.exportIncluded===false)throw Error("请选择可编辑的静态图标和数据源配置");
  const hidden=new Set(c.hideWhenChangedFromDefault||[]);if(enabled)hidden.add(layerId);else hidden.delete(layerId);
  const next={...setControl(p,c.id,controlValue(p,c)),controls:p.controls!.map(x=>x.id===c.id?{...x,hideWhenChangedFromDefault:hidden.size?[...hidden]:undefined}:x)};
  validateControls(next);return next;
}
