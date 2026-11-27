import type { Layer, Project } from "./domain";
import type { ProjectControl } from "./projectControls";
import { resolveControls } from "./projectControls.ts";
export type WidgetPart = {
  id: string;
  name: string;
  layerIds: string[];
  enabled: boolean;
  active?: boolean;
  aod?: boolean;
};
export type Compound = {
  version: 1 | 2;
  width: number;
  height: number;
  layers: Layer[];
  controls: ProjectControl[];
  controlValues?: Record<string, string | boolean>;
  parts: WidgetPart[];
  disabledLayers?: string[];
};
export const compoundV1Kinds = [
  "text",
  "metric",
  "rect",
  "circle",
  "line",
  "meter",
];
export const compoundV2Kinds = [
  ...compoundV1Kinds,
  "time",
  "date",
  "image",
  "hand",
  "ring",
  "polygon",
  "arcText",
];
export const compoundStyleKeys = [
  "x",
  "y",
  "w",
  "h",
  "size",
  "rotation",
  "color",
  "strokeColor",
  "strokeWidth",
  "ringWidth",
  "arcSpacing",
  "aod",
  "aodColor",
  "aodSize",
  "exportIncluded",
  "hidden",
] as const;
export type CompoundStyle = Partial<
  Pick<Layer, (typeof compoundStyleKeys)[number]>
>;
export function makeParts(layers: Layer[]): WidgetPart[] {
  const names: Record<string, string> = {
    heartRate: "心率数值",
    steps: "步数数值",
    battery: "电量数值",
    calories: "热量数值",
    distance: "距离数值",
    seconds: "秒数",
  };
  const metrics = layers.filter((l) => l.kind === "metric");
  if (metrics.length > 1) {
    return metrics.map((metric) => ({
      id: "row-" + metric.id,
      name: (names[metric.source] || metric.name).replace("数值", "数据行"),
      layerIds: layers
        .filter(
          (l) =>
            metrics.reduce(
              (best, m) =>
                Math.abs(m.y + m.h / 2 - l.y - l.h / 2) <
                Math.abs(best.y + best.h / 2 - l.y - l.h / 2)
                  ? m
                  : best,
              metrics[0],
            ).id === metric.id,
        )
        .map((l) => l.id),
      enabled: true,
    }));
  }
  const groups = new Map<string, Layer[]>();
  for (const l of layers) {
    const key =
      l.kind === "metric"
        ? "metric-" + l.id
        : l.kind === "meter"
          ? "progress"
          : l.kind === "line"
            ? "divider"
            : l.kind === "rect"
              ? "background"
              : l.kind === "circle" || /符号|图标|字母/.test(l.name)
                ? "icons"
                : "titles";
    groups.set(key, [...(groups.get(key) || []), l]);
  }
  return [...groups].map(([id, ls]) => ({
    id,
    name: id.startsWith("metric-")
      ? names[ls[0].source] || ls[0].name
      : {
          background: "背景",
          progress: "进度条",
          divider: "分隔线",
          icons: "图标",
          titles: "标题与标注",
        }[id] || id,
    layerIds: ls.map((l) => l.id),
    enabled: true,
  }));
}
export function compoundState(
  p: Project,
  layers: Layer[],
  controls: ProjectControl[],
): Compound {
  const resolved = resolveControls({
    ...p,
    multiDevice: undefined,
    layers,
    controls,
  });
  return {
    version: 1,
    width: 1,
    height: 1,
    layers: resolved.layers,
    controls: controls.filter((c) => c.type !== "boolean"),
    controlValues: Object.fromEntries(
      controls
        .filter(
          (c) => c.type !== "boolean" && p.controlValues?.[c.id] !== undefined,
        )
        .map((c) => [c.id, p.controlValues![c.id]]),
    ),
    parts: makeParts(resolved.layers),
  };
}
export function expandedChildren(l: Layer, p: Project): Layer[] {
  const b = l.compound!;
  const scale = Math.min(l.w / b.width, l.h / b.height);
  const ox = l.x + (l.w - b.width * scale) / 2,
    oy = l.y + (l.h - b.height * scale) / 2;
  const raw = b.layers.map((c) => ({ ...c, ...l.compoundOverrides?.[c.id] }));
  const children = resolveControls({
    ...p,
    multiDevice: undefined,
    layers: raw,
    controls: b.controls,
    controlValues: b.controlValues,
  }).layers;
  return children.map((c) => {
    const part = b.parts.find((part) => part.layerIds.includes(c.id))!;
    const enabled = part.enabled && !b.disabledLayers?.includes(c.id);
    return {
      ...c,
      x: ox + c.x * scale,
      y: oy + c.y * scale,
      w: c.w * scale,
      h: c.h * scale,
      size: c.size * scale,
      ...(c.strokeWidth !== undefined
        ? { strokeWidth: c.strokeWidth * scale }
        : {}),
      ...(c.cornerRadius !== undefined
        ? { cornerRadius: c.cornerRadius * scale }
        : {}),
      ...(c.aodSize !== undefined ? { aodSize: c.aodSize * scale } : {}),
      ...(c.kind === "meter" ? { meterGap: (c.meterGap ?? 3) * scale } : {}),
      ...(c.ringWidth !== undefined ? { ringWidth: c.ringWidth * scale } : {}),
      ...(c.arcSpacing !== undefined
        ? { arcSpacing: c.arcSpacing * scale }
        : {}),
      groupId: undefined,
      groupName: undefined,
      widgetOrigin: l.widgetOrigin || c.widgetOrigin,
      hidden: l.hidden || c.hidden,
      locked: l.locked,
      exportIncluded:
        l.exportIncluded === false || !enabled ? false : c.exportIncluded,
      activeVisible:
        enabled &&
        l.activeVisible !== false &&
        (part.active ?? c.activeVisible !== false),
      aod: l.aod && enabled && (part.aod ?? c.aod),
      ...(l.effectPrompt
        ? {
            effectPrompt: [l.effectPrompt, c.effectPrompt]
              .filter(Boolean)
              .join("\n"),
          }
        : {}),
      compound: undefined,
      compoundOverrides: undefined,
    };
  });
}
export function expandWidgets(p: Project, hitBoxes = false): Project {
  if (!p.layers.some((l) => l.kind === "widget")) return p;
  const layers: Layer[] = [],
    controls = [...(p.controls || [])],
    values = { ...p.controlValues };
  for (const l of p.layers) {
    if (l.kind !== "widget") {
      layers.push(l);
      continue;
    }
    const children = expandedChildren(l, p);
    if (hitBoxes)
      layers.push({
        ...l,
        kind: "rect",
        compound: undefined,
        compoundOverrides: undefined,
        fillEnabled: true,
        strokeEnabled: false,
        opacity: 0,
        cornerRadius: 0,
      });
    layers.push(...children);
    for (const c of l.compound!.controls) {
      controls.push({
        ...c,
        label: l.name + " · " + c.label.split(" · ").at(-1),
        targets: c.targets.map((t) => ({ ...t })),
      });
      if (l.compound!.controlValues?.[c.id] !== undefined)
        values[c.id] = l.compound!.controlValues[c.id];
    }
  }
  return {
    ...p,
    layers,
    controls,
    controlValues: values,
    multiDevice: undefined,
  };
}
export function validateCompound(
  l: Layer,
  p: Project,
  validate: (p: Project) => unknown,
) {
  if (l.kind !== "widget") {
    if (l.compound !== undefined || l.compoundOverrides !== undefined)
      throw Error("复合控件数据只能用于复合对象");
    return;
  }
  if (p.controls?.some((c) => c.targets.some((t) => t.layerId === l.id)))
    throw Error("复合控件配置必须保存在对象内部");
  const b = l.compound;
  if (
    !b ||
    ![1, 2].includes(b.version) ||
    !Number.isFinite(b.width) ||
    !Number.isFinite(b.height) ||
    b.width <= 0 ||
    b.height <= 0 ||
    b.width > 454 ||
    b.height > 454 ||
    !Array.isArray(b.layers) ||
    !b.layers.length ||
    b.layers.length > 40 ||
    !Array.isArray(b.controls) ||
    !Array.isArray(b.parts) ||
    b.parts.length < 1 ||
    b.parts.length > 40 ||
    l.rotation !== 0 ||
    l.visibility
  )
    throw Error("复合控件结构或变换无效");
  if (
    b.layers.some(
      (c) =>
        !c ||
        !(b.version === 1 ? compoundV1Kinds : compoundV2Kinds).includes(
          c.kind,
        ) ||
        c.compound !== undefined ||
        c.compoundOverrides !== undefined,
    )
  )
    throw Error("复合控件内部类型无效或包含嵌套");
  const seen = new Set<string>(),
    parts = new Set<string>();
  for (const part of b.parts) {
    if (
      !part ||
      typeof part.id !== "string" ||
      parts.has(part.id) ||
      typeof part.name !== "string" ||
      part.name.length > 120 ||
      typeof part.enabled !== "boolean" ||
      !Array.isArray(part.layerIds) ||
      !part.layerIds.length ||
      [part.active, part.aod].some(
        (v) => v !== undefined && typeof v !== "boolean",
      )
    )
      throw Error("复合控件部件定义无效");
    parts.add(part.id);
    for (const id of part.layerIds) {
      if (seen.has(id) || !b.layers.some((c) => c.id === id))
        throw Error("复合控件部件引用重复或缺失");
      seen.add(id);
    }
  }
  if (
    seen.size !== b.layers.length ||
    new Set(b.layers.map((c) => c.id)).size !== b.layers.length
  )
    throw Error("复合控件部件未覆盖全部内部图层");
  if (
    b.disabledLayers !== undefined &&
    (!Array.isArray(b.disabledLayers) ||
      new Set(b.disabledLayers).size !== b.disabledLayers.length ||
      b.disabledLayers.some((id) => !seen.has(id)))
  )
    throw Error("内部部件启用引用无效");
  validateCompoundOverrides(l, l.compoundOverrides);
  validate({
    ...p,
    multiDevice: undefined,
    layers: b.layers.map((c) => ({ ...c, ...l.compoundOverrides?.[c.id] })),
    controls: b.controls,
    controlValues: b.controlValues,
    designSnapshots: [],
    files: [],
    versions: [],
    assets: undefined,
  });
}
export function validateCompoundOverrides(
  l: Layer,
  overrides: Layer["compoundOverrides"],
) {
  if (overrides === undefined) return;
  if (
    l.kind !== "widget" ||
    !overrides ||
    typeof overrides !== "object" ||
    Array.isArray(overrides)
  )
    throw Error("复合控件微调无效");
  for (const [id, patch] of Object.entries(overrides)) {
    if (
      !l.compound?.layers.some((c) => c.id === id) ||
      !patch ||
      typeof patch !== "object" ||
      Array.isArray(patch)
    )
      throw Error("复合控件微调引用无效");
    for (const [k, v] of Object.entries(patch)) {
      if (
        !(compoundStyleKeys as readonly string[]).includes(k) ||
        (["hidden", "aod", "exportIncluded"].includes(k)
          ? typeof v !== "boolean"
          : ["color", "strokeColor", "aodColor"].includes(k)
            ? typeof v !== "string" || !/^#[a-f0-9]{6}$/i.test(v)
            : typeof v !== "number" || !Number.isFinite(v))
      )
        throw Error("复合控件微调属性无效");
    }
  }
}
export function wrapLegacyWidgets<
  T extends {
    layers: Layer[];
    controls?: ProjectControl[];
    controlValues?: Record<string, string | boolean>;
  },
>(p: T): T {
  const groups = new Map<string, Layer[]>();
  for (const l of p.layers)
    if (l.groupId && !l.compound && l.widgetOrigin)
      groups.set(l.groupId, [...(groups.get(l.groupId) || []), l]);
  if (!groups.size) return p;
  let layers = [...p.layers],
    controls = [...(p.controls || [])],
    values = { ...p.controlValues };
  for (const [group, ls] of groups) {
    const all = p.layers.filter((l) => l.groupId === group);
    if (
      all.length !== ls.length ||
      ls.some(
        (l) =>
          !["text", "metric", "rect", "circle", "line", "meter"].includes(
            l.kind,
          ) ||
          l.widgetOrigin?.id !== ls[0].widgetOrigin?.id ||
          l.widgetOrigin?.version !== ls[0].widgetOrigin?.version,
      )
    )
      continue;
    const positions = p.layers
      .map((l, i) => (l.groupId === group ? i : -1))
      .filter((i) => i >= 0);
    if (positions.some((at, i) => i > 0 && at !== positions[i - 1] + 1))
      continue;
    const ids = new Set(ls.map((l) => l.id));
    const mine = controls.filter((c) =>
      c.targets.some((t) => ids.has(t.layerId)),
    );
    if (mine.some((c) => c.targets.some((t) => !ids.has(t.layerId)))) continue;
    const x = Math.min(...ls.map((l) => l.x)),
      y = Math.min(...ls.map((l) => l.y)),
      w = Math.max(...ls.map((l) => l.x + l.w)) - x,
      h = Math.max(...ls.map((l) => l.y + l.h)) - y;
    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w <= 0 ||
      h <= 0 ||
      w > 454 ||
      h > 454
    )
      continue;
    const base = p as unknown as Project;
    const b = compoundState(
      base,
      ls.map((c) => ({
        ...c,
        x: c.x - x,
        y: c.y - y,
        groupId: undefined,
        groupName: undefined,
      })),
      mine,
    );
    b.width = w;
    b.height = h;
    const root: Layer = {
      id: "widget-" + ls[0].id,
      name: ls[0].groupName || ls[0].widgetOrigin!.id,
      kind: "widget",
      x,
      y,
      w,
      h,
      color: ls[0].color,
      size: 14,
      rotation: 0,
      hidden: false,
      locked: ls.some((l) => l.locked),
      text: "",
      source: "heartRate",
      aod: true,
      threshold: false,
      widgetOrigin: ls[0].widgetOrigin,
      compound: b,
    };
    const at = layers.findIndex((l) => ids.has(l.id));
    layers = layers.filter((l) => !ids.has(l.id));
    layers.splice(at, 0, root);
    controls = controls.filter((c) => !mine.includes(c));
    for (const c of mine) delete values[c.id];
  }
  return { ...p, layers, controls, controlValues: values };
}
export function migrateCompounds(p: Project): Project {
  const state = wrapLegacyWidgets(p);
  let changed =
    state.layers.some((l) => l.kind === "widget") &&
    JSON.stringify(state.layers) !== JSON.stringify(p.layers);
  if (p.multiDevice) {
    const m = p.multiDevice;
    const master = wrapLegacyWidgets({ ...p, layers: m.master });
    if (JSON.stringify(master.layers) !== JSON.stringify(m.master)) {
      const roots = master.layers.filter((l) => l.kind === "widget");
      const variants = m.variants.map((v) => {
        const overrides = { ...v.overrides };
        for (const root of roots) {
          const nested: NonNullable<Layer["compoundOverrides"]> = {};
          for (const c of root.compound!.layers) {
            const patch = overrides[c.id];
            if (!patch) continue;
            delete overrides[c.id];
            nested[c.id] = {
              ...patch,
              ...(patch.x !== undefined ? { x: patch.x - root.x } : {}),
              ...(patch.y !== undefined ? { y: patch.y - root.y } : {}),
            };
          }
          if (Object.keys(nested).length)
            overrides[root.id] = { compoundOverrides: nested };
        }
        return { ...v, overrides, code: { ...v.code, codeRevision: -1 } };
      });
      const current =
        variants.find(
          (v) => v.target === p.target && v.deviceSize === p.deviceSize,
        ) || variants[0];
      state.multiDevice = { ...m, master: master.layers, variants };
      state.controls = master.controls;
      state.controlValues = master.controlValues;
      state.layers =
        m.scope === "master"
          ? master.layers
          : master.layers.map((l) => ({ ...l, ...current.overrides[l.id] }));
      changed = true;
    } else {
      Object.assign(state, p);
      changed = false;
    }
  }
  return {
    ...state,
    ...(changed ? { revision: p.revision + 1, codeRevision: -1 } : {}),
    designSnapshots: p.designSnapshots?.map((s) => {
      const snap = migrateCompounds({
        ...p,
        ...s,
        multiDevice: s.multiDevice,
        designSnapshots: [],
      });
      return {
        ...s,
        layers: snap.layers,
        controls: snap.controls,
        controlValues: snap.controlValues,
        multiDevice: snap.multiDevice,
      };
    }),
  };
}
