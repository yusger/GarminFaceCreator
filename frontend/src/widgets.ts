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
  licenseText: string;
  notice: string;
};
export const widgets = catalog as unknown as Widget[];
function topology(p: Project, next: Project) {
  const result = reconcileDevices(p, next)!;
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
    const resolved = expandedChildren({ ...root, ...v.overrides[id] }, p);
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
    controls: [...(p.controls || []), ...b.controls],
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
  for (const l of p.layers) {
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
