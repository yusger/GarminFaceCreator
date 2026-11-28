import {applyDeviceOverride} from "./deviceOverrides.ts";
import {withEditorLayers} from "./editorHistory.ts";
import { groupBox } from "./selection.ts";
import { compoundV1Kinds, compoundV2Kinds, makeParts } from "./compound.ts";
import { reconcileDevices } from "./multiDevice.ts";
import { compoundState, expandedChildren, expandWidgets } from "./compound.ts";
import catalog from "./widgetCatalog.json" with { type: "json" };
import {
  layer,
  uid,
  validateProject,
  type Layer,
  type Project,
} from "./domain.ts";
import type { ProjectControl } from "./projectControls";
export type WidgetOrigin = {
  id: string;
  version: string;
  license: string;
  notice: string;
};
type Widget = {
  id: string;
  name: string;
  version: string;
  canvas: { width: number; height: number };
  layers: Array<Partial<Layer> & { id: string; kind: Layer["kind"] }>;
  parameters: ProjectControl[];
  previews?: {active:string;aod:string};
  licenseText: string;
  notice: string;
};
export const widgets = catalog as unknown as Widget[];
function topology(p: Project, next: Project) {
  const scoped=withEditorLayers({...next,layers:p.layers},next.layers);
  const result = reconcileDevices(p, scoped)!;
  if (result.multiDevice)
    result.multiDevice = {
      ...result.multiDevice,
      viewVersion: (p.multiDevice?.viewVersion || 0) + 1,
    };
  validateProject(result);
  return result;
}
export function insertWidget(p: Project, id: string): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后添加控件");
  const w = widgets.find((w) => w.id === id);
  if (!w) throw Error("控件不存在");
  const ids = new Map(w.layers.map((l) => [l.id, uid()]));
  let n = 1;
  while (p.layers.some((l) => l.name === w.name + " #" + n)) n++;
  const name = w.name + " #" + n;
  const children = w.layers.map((def) => ({
    ...layer(def.kind),
    threshold: false,
    metricDecoration: false,
    ...structuredClone(def),
    id: ids.get(def.id)!,
  }));
  const controls = w.parameters.map((c) => ({
    ...structuredClone(c),
    id: "w-" + uid(),
    label: name + " · " + c.label,
    targets: c.targets.map((t) => ({ ...t, layerId: ids.get(t.layerId)! })),
  }));
  const compound = compoundState(
    { ...p, controlValues: {} },
    children,
    controls,
  );
  if(children.some(c=>!compoundV1Kinds.includes(c.kind))) compound.version=2;
  compound.width = w.canvas.width;
  compound.height = w.canvas.height;
  const root = {
    ...layer("widget"),
    name,
    x: (454 - w.canvas.width) / 2,
    y: (454 - w.canvas.height) / 2,
    w: w.canvas.width,
    h: w.canvas.height,
    aod: true,
    threshold: false,
    compound,
    widgetOrigin: {
      id: w.id,
      version: w.version,
      license: w.licenseText,
      notice: w.notice,
    },
  };
  return topology(p, {
    ...p,
    layers: [...p.layers, root],
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  });
}
export function combineLayers(p: Project, selected: string[]): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请在共享主设计中合并控件");
  const ids = new Set(selected),
    chosen = p.layers.filter((l) => ids.has(l.id));
  if (
    chosen.length < 2 ||
    chosen.length > 40 ||
    chosen.some((l) => l.locked || !compoundV2Kinds.includes(l.kind))
  )
    throw Error("请选择2–40个未锁定的基础控件，不能嵌套复合控件");
  const positions = p.layers.flatMap((l, i) => (ids.has(l.id) ? [i] : []));
  if (positions.some((at, i) => i > 0 && at !== positions[i - 1] + 1))
    throw Error("合并前请将所选图层排列相邻，避免改变与其他图层的遮挡顺序");
  if (
    p.layers.some(
      (l) => l.sourceLabelFor && ids.has(l.id) !== ids.has(l.sourceLabelFor),
    )
  )
    throw Error("请同时选择数据层及其联动标签");
  const own = (p.controls || []).filter((c) =>
    c.targets.some((t) => ids.has(t.layerId)),
  );
  if (
    own.some(
      (c) =>
        c.targets.some((t) => !ids.has(t.layerId)) ||
        c.hideWhenChangedFromDefault?.some((id) => !ids.has(id)),
    ) ||
    (p.controls || []).some(
      (c) =>
        !own.includes(c) &&
        c.hideWhenChangedFromDefault?.some((id) => ids.has(id)),
    )
  )
    throw Error("配置跨越所选图层，请同时选择其全部目标和联动层");
  if (
    p.multiDevice?.variants.some((v) => chosen.some((l) => v.overrides[l.id]))
  )
    throw Error("所选图层已有设备微调，暂不能合并；保留基础图层可避免丢失微调");
  const box = groupBox(chosen);
  if (box.w > 454 || box.h > 454 || box.w <= 0 || box.h <= 0)
    throw Error("复合控件原始边界须在454×454以内");
  const children = structuredClone(chosen).map((l) => ({
    ...l,
    x: l.x - box.x,
    y: l.y - box.y,
    groupId: undefined,
    groupName: undefined,
  }));
  const controls = structuredClone(own),
    values = Object.fromEntries(
      own
        .filter((c) => p.controlValues?.[c.id] !== undefined)
        .map((c) => [c.id, p.controlValues![c.id]]),
    );
  const root = {
    ...layer("widget"),
    name: "自定义复合控件",
    ...box,
    aod: true,
    compound: {
      version: 2 as const,
      width: box.w,
      height: box.h,
      layers: children,
      controls,
      controlValues: values,
      parts: makeParts(children),
    },
  };
  const next = {
    ...p,
    layers: p.layers.flatMap((l, i) =>
      i === positions[0] ? [root] : ids.has(l.id) ? [] : [l],
    ),
    controls: (p.controls || []).filter((c) => !own.includes(c)),
    controlValues: Object.fromEntries(
      Object.entries(p.controlValues || {}).filter(
        ([id]) => !own.some((c) => c.id === id),
      ),
    ),
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
  return topology(p, next);
}

export function cloneCompound(l: Layer): Layer {
  const copy = structuredClone(l);
  copy.id = uid();
  if (!copy.compound) return copy;
  const b = copy.compound,
    ids = new Map(b.layers.map((c) => [c.id, uid()])),
    controls = new Map(b.controls.map((c) => [c.id, "w-" + uid()]));
  b.layers = b.layers.map((c) => ({
    ...c,
    id: ids.get(c.id)!,
    ...(c.sourceLabelFor
      ? { sourceLabelFor: ids.get(c.sourceLabelFor) || c.sourceLabelFor }
      : {}),
  }));
  b.disabledLayers = b.disabledLayers?.map((id) => ids.get(id)!);
  b.parts = b.parts.map((part) => ({
    ...part,
    layerIds: part.layerIds.map((id) => ids.get(id)!),
  }));
  b.controls = b.controls.map((c) => ({
    ...c,
    id: controls.get(c.id)!,
    targets: c.targets.map((t) => ({ ...t, layerId: ids.get(t.layerId)! })),
    hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.map((id) =>
      ids.get(id)!,
    ),
  }));
  b.controlValues = Object.fromEntries(
    Object.entries(b.controlValues || {}).map(([id, v]) => [
      controls.get(id)!,
      v,
    ]),
  );
  if (copy.compoundOverrides)
    copy.compoundOverrides = Object.fromEntries(
      Object.entries(copy.compoundOverrides).map(([id, v]) => [
        ids.get(id)!,
        v,
      ]),
    );
  return copy;
}
export function decomposeWidget(p: Project, id: string): Project {
  if (p.multiDevice?.scope === "device") throw Error("请切换共享主设计后拆解");
  const root = p.layers.find((l) => l.id === id);
  if (!root?.compound) return p;
  const children = expandedChildren(root, p),
    b = root.compound;
  // Per-device internal style overrides must not disappear on decomposition.
  const overrides = p.multiDevice?.variants.map((v) => {
    const next = { ...v.overrides };
    delete next[id];
    const resolved = expandedChildren(applyDeviceOverride(root,v.overrides[id]), p);
    for (const l of resolved) {
      const base = children.find((c) => c.id === l.id)!;
      const patch: Record<string, unknown> = {};
      for (const k of [
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
      ] as const)
        if (JSON.stringify(l[k]) !== JSON.stringify(base[k])) patch[k] = l[k];
      if (Object.keys(patch).length) next[l.id] = patch;
    }
    return { ...v, overrides: next };
  });
  const next = {
    ...p,
    layers: p.layers.flatMap((l) => (l.id === id ? children : [l])),
    controls: [
      ...(p.controls || []),
      ...b.controls.map((c) => ({
        ...c,
        label: root.name + " · " + c.label.split(" · ").at(-1),
      })),
    ],
    controlValues: { ...p.controlValues, ...b.controlValues },
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
    ...(p.multiDevice
      ? { multiDevice: { ...p.multiDevice, variants: overrides! } }
      : {}),
  };
  return topology(p, next);
}
export function validateWidgetOrigin(o: WidgetOrigin | undefined) {
  if (
    o !== undefined &&
    (!o ||
      !/^[a-z][a-z0-9-]{0,79}$/.test(o.id) ||
      !/^\d+\.\d+\.\d+$/.test(o.version) ||
      typeof o.license !== "string" ||
      !o.license.length ||
      o.license.length > 32000 ||
      typeof o.notice !== "string" ||
      o.notice.length > 8000)
  )
    throw Error("控件来源或许可无效");
}
export function widgetNotices(p: Project) {
  const notices = new Map<string, WidgetOrigin>();
  for (const l of [...p.layers, ...p.layers.flatMap(l=>l.compound?.layers || [])]) {
    const o = l.widgetOrigin;
    if (!o) continue;
    validateWidgetOrigin(o);
    const key = o.id + "-" + o.version;
    const prior = notices.get(key);
    if (prior && (prior.license !== o.license || prior.notice !== o.notice))
      throw Error("控件来源或许可无效");
    notices.set(key, o);
  }
  return [...notices.values()];
}
