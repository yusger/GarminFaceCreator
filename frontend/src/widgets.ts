import { reconcileDevices } from "./multiDevice.ts";
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
export function insertWidget(p: Project, id: string): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后添加控件");
  const w = widgets.find((w) => w.id === id);
  if (!w) throw Error("控件不存在");
  if (
    p.layers.length + w.layers.length > 200 ||
    (p.controls?.length || 0) + w.parameters.length > 40
  )
    throw Error("添加后将超过200图层或40配置项上限");
  const groupId = uid(),
    ids = new Map(w.layers.map((l) => [l.id, uid()]));
  let n = 1;
  while (p.controls?.some((c) => c.label.startsWith(w.name + " #" + n + " · ")))
    n++;
  const groupName = w.name + " #" + n;
  const origin: WidgetOrigin = {
    id: w.id,
    version: w.version,
    license: w.licenseText,
    notice: w.notice,
  };
  const layers = w.layers.map((def) => ({
    ...layer(def.kind),
    threshold: false,
    metricDecoration: false,
    ...structuredClone(def),
    id: ids.get(def.id)!,
    x: (454 - w.canvas.width) / 2 + def.x!,
    y: (454 - w.canvas.height) / 2 + def.y!,
    widgetOrigin: structuredClone(origin),
    groupId,
    groupName,
  }));
  const controls = w.parameters.map((c) => ({
    ...structuredClone(c),
    id: "w-" + uid(),
    label: groupName + " · " + c.label,
    targets: c.targets.map((t) => ({ ...t, layerId: ids.get(t.layerId)! })),
  }));
  const next = {
    ...p,
    layers: [...p.layers, ...layers],
    controls: [...(p.controls || []), ...controls],
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
  const result = reconcileDevices(p, next)!;
  if (result.multiDevice)
    result.multiDevice = {
      ...result.multiDevice,
      viewVersion: (p.multiDevice?.viewVersion || 0) + 1,
    };
  validateProject(result);
  return result;
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
