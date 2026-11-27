import { uid,type Layer,type Project } from "./domain.ts";
import type { ProjectControl } from "./projectControls.ts";
import { metricDisplayUnits } from "./metricFormat.ts";
import { defaultThresholds } from "./thresholds.ts";
export const slotSources = [
  "heartRate",
  "steps",
  "battery",
  "calories",
  "distance",
  "temperature",
  "seconds",
];
export const slotLabels: Record<string, string> = {
  heartRate: "心率",
  steps: "步数",
  battery: "电量",
  calories: "当日总热量",
  distance: "当日距离",
  temperature: "天气温度",
  seconds: "秒数",
};
export const slotGoals: Record<string, number> = {
  heartRate: 180,
  steps: 10000,
  battery: 100,
  calories: 1000,
  distance: 10,
  temperature: 40,
  seconds: 60,
};
export function allowedSlotSources(l: Layer) {
  return l.kind === "metric"
    ? slotSources
    : l.kind === "meter"
      ? ["steps", "battery"]
      : l.kind === "ring"
        ? ["steps", "battery", "heartRate", "seconds"]
        : [];
}
export function validateDataSlots(p: Project) {
  for (const c of p.controls || []) {
    if (c.slot !== undefined && c.slot !== true) throw Error("数据槽标识无效");
    if (c.slot !== true) {
      if (c.sourceGoals !== undefined || c.preserveFormatFor !== undefined)
        throw Error("数据槽字段仅限数据槽");
      continue;
    }
    if (
      c.type !== "dataSource" ||
      !Array.isArray(c.options) ||
      !c.options.length ||
      !Array.isArray(c.targets)
    )
      throw Error("数据槽必须为来源配置");
    for (const t of c.targets) {
      const l = p.layers.find((l) => l.id === t.layerId);
      if (
        !l ||
        t.property !== "source" ||
        c.options.some((s) => !allowedSlotSources(l).includes(s))
      )
        throw Error("数据槽包含不兼容的控件或来源");
    }
    if (
      c.sourceGoals !== undefined &&
      (!c.sourceGoals ||
        Array.isArray(c.sourceGoals) ||
        typeof c.sourceGoals !== "object" ||
        Object.entries(c.sourceGoals).some(
          ([s, v]) =>
            !c.options!.includes(s) ||
            typeof v !== "number" ||
            !Number.isFinite(v) ||
            v <= 0 ||
            v > 1e9,
        ))
    )
      throw Error("数据槽设计目标无效");
    if (
      c.preserveFormatFor !== undefined &&
      (!Array.isArray(c.preserveFormatFor) ||
        new Set(c.preserveFormatFor).size !== c.preserveFormatFor.length ||
        c.preserveFormatFor.some(
          (id) => !c.targets.some((t) => t.layerId === id),
        ))
    )
      throw Error("数据槽格式覆盖引用无效");
  }
}
export function sourceSlotLayer(
  p: Project,
  l: Layer,
  c: ProjectControl,
  source: string,
): Layer {
  if (!c.slot) return { ...l, source };
  if (!allowedSlotSources(l).includes(source))
    throw Error("该数据槽来源不适用于控件");
  const base = p.layers.find((x) => x.id === l.id) || l;
  const changed = source !== c.default,
    goal = c.sourceGoals?.[source] ?? slotGoals[source];
  const next = {
    ...l,
    source,
    ...(l.kind === "ring"
      ? { ringSource: source as Layer["ringSource"], ringGoal: goal }
      : {}),
    ...(l.kind === "meter" ? { meterGoal: goal } : {}),
  };
  if (l.kind === "metric") {
    if (!c.preserveFormatFor?.includes(l.id)) {
      next.label = "";
      next.unit = metricDisplayUnits[source] || "";
      next.precision =
        source === "distance" ? 2 : source === "temperature" ? 1 : 0;
      next.autoPrecision = false;
      next.autoSourceFormat = false;
      next.groupThousands = source === "steps";
      next.metricDecoration = false;
    }
    // Source-specific thresholds cannot follow an unrelated reading; preserve custom rules for the default source.
    if (!changed) {
      next.threshold = base.threshold;
      next.thresholdRules = base.thresholdRules;
      next.thresholdFallback = base.thresholdFallback;
    }
    if (changed) {
      next.thresholdRules = defaultThresholds(source, l.color);
      next.threshold = next.thresholdRules.length > 0;
      next.thresholdFallback = l.color;
    }
  }
  return next;
}
export function createDataSlot(
  p: Project,
  layerIds: string[],
  label = "数据槽",
): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后创建数据槽");
  const members = p.layers.filter((l) => layerIds.includes(l.id));
  if ((p.controls?.length || 0) >= 40) throw Error("配置项已达40项上限");
  if (
    !members.length ||
    members.length !== new Set(layerIds).size ||
    members.some(
      (l) =>
        l.locked ||
        l.sourceLocked ||
        l.compound ||
        !allowedSlotSources(l).length,
    )
  )
    throw Error("请选择未锁定的数值、进度条或进度环");
  if (
    members.some((l) =>
      p.controls?.some((c) =>
        c.targets.some((t) => t.layerId === l.id && t.property === "source"),
      ),
    )
  )
    throw Error("图层已有来源配置，请编辑现有绑定");
  const options = slotSources.filter((s) =>
    members.every((l) => allowedSlotSources(l).includes(s)),
  );
  const defaults = members.map((l) =>
    l.kind === "ring" ? l.ringSource : l.source,
  );
  if (
    !options.length ||
    new Set(defaults).size !== 1 ||
    !options.includes(defaults[0] || "")
  )
    throw Error("数据槽成员须有相同且兼容的初始来源");
  const id = "slot-" + uid().slice(0, 8);
  const goal = members.find((l) => l.kind === "meter" || l.kind === "ring");
  const value = goal?.kind === "ring" ? goal.ringGoal : goal?.meterGoal;
  const c: ProjectControl = {
    id,
    label: label.trim().slice(0, 100) || "数据槽",
    type: "dataSource",
    slot: true,
    default: defaults[0]!,
    options,
    targets: members.map((l) => ({ layerId: l.id, property: "source" })),
    ...(value ? { sourceGoals: { [defaults[0]!]: value } } : {}),
  };
  const next = {
    ...p,
    controls: [...(p.controls || []), c],
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
  validateDataSlots(next);
  return next;
}
