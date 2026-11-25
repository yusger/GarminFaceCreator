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
};
export const sourceLabels: Record<string, string> = {
  heartRate: "bpm",
  steps: "steps",
  battery: "batt",
  calories: "kcal",
  distance: "km",
  temperature: "temp",
  seconds: "sec",
};
export const defaultPrecision = (source: string) =>
  source === "distance" ? 2 : source === "temperature" ? 1 : 0;
export function controlValue(p: Project, c: ProjectControl) {
  return p.controlValues?.[c.id] ?? c.default;
}
export function validateControls(p: Project) {
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
    const valid = (v: unknown) =>
      c.type === "boolean"
        ? typeof v === "boolean"
        : c.type === "color"
          ? typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v)
          : typeof v === "string" &&
            !!c.options?.includes(v) &&
            !!sourceLabels[v];
    if (
      !valid(c.default) ||
      !valid(controlValue(p, c)) ||
      (c.type === "dataSource" &&
        (!c.options?.length || c.options.some((v) => !sourceLabels[v])))
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
            ? t.property !== "source" || l.sourceLocked || l.kind !== "metric"
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
      l.customFont &&
      (!/^[a-zA-Z0-9_-]+$/.test(l.customFont.id) ||
        !/^[-a-zA-Z0-9_]+\.(ttf|otf)$/.test(l.customFont.file) ||
        typeof l.customFont.family !== "string")
    )
      throw Error("自定义字体无效");
    if (l.sourceLabelFor && !ids.has(l.sourceLabelFor))
      throw Error("数据标签引用缺失");
    for (const key of [
      "activeVisible",
      "imageFullColor",
      "autoPrecision",
      "groupThousands",
      "meterContinuous",
    ] as const)
      if (l[key] !== undefined && typeof l[key] !== "boolean")
        throw Error("控件扩展属性无效");
    if (l.dateFormat !== undefined && l.dateFormat !== "monthDayWeek")
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
export function resolvedLayer(l: Layer, layers: Layer[]): Layer {
  const source = l.sourceLabelFor
    ? layers.find((x) => x.id === l.sourceLabelFor)?.source
    : undefined;
  return {
    ...l,
    ...(source ? { text: sourceLabels[source] || "--" } : {}),
    ...(l.autoPrecision ? { precision: defaultPrecision(l.source) } : {}),
  };
}
export function resolveControls(p: Project): Project {
  if (
    !p.controls?.length &&
    !p.layers.some((l) => l.sourceLabelFor || l.autoPrecision)
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
        if (l) l.activeVisible = false;
      }
  return { ...p, layers: layers.map((l) => resolvedLayer(l, layers)) };
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
  after.controls = before.controls?.map((c) => ({
    ...c,
    targets: c.targets.map((t) => ({ ...t, layerId: id(t.layerId) })),
    hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.map(id),
  }));
  after.layers = after.layers.map((l) => ({
    ...l,
    ...(l.sourceLabelFor ? { sourceLabelFor: id(l.sourceLabelFor) } : {}),
  }));
}

export function resetControls(p: Project): Project {
  const first = p.controls?.[0];
  return first
    ? { ...setControl(p, first.id, first.default), controlValues: undefined }
    : p;
}
