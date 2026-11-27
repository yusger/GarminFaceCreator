import { layer, uid, type Project, type Layer } from "./domain.ts";
import { combineLayers } from "./widgets.ts";
import { validateVisibility, type VisibilityCondition } from "./visibility.ts";
export const statePresets = {
  heartRate: [
    {
      name: "静息 <100",
      color: "#45D6BE",
      condition: { source: "heartRate", max: 100 },
    },
    {
      name: "预备 100–119",
      color: "#FFD060",
      condition: { source: "heartRate", min: 100, max: 120 },
    },
    {
      name: "扭动 120–140",
      color: "#FF9B45",
      condition: {
        source: "heartRate",
        min: 120,
        max: 140,
        maxInclusive: true,
      },
    },
    {
      name: "疯狂 >140",
      color: "#FF6B6B",
      condition: { source: "heartRate", min: 140, minExclusive: true },
    },
  ],
  battery: [
    {
      name: "充足 ≥30%",
      color: "#45D6BE",
      condition: { source: "battery", min: 30 },
    },
    {
      name: "偏低 10–29%",
      color: "#FFD060",
      condition: { source: "battery", min: 10, max: 30 },
    },
    {
      name: "不足 <10%",
      color: "#FF6B6B",
      condition: { source: "battery", max: 10 },
    },
  ],
} satisfies Record<
  string,
  { name: string; color: string; condition: VisibilityCondition }[]
>;
export function createStateGroup(
  p: Project,
  id: string,
  preset: keyof typeof statePresets,
): Project {
  const original = p.layers.find((l) => l.id === id);
  if (!original || original.locked || original.kind === "widget")
    throw Error("请选择一个未锁定的基础控件");
  if (p.multiDevice)
    throw Error("请在启用多设备前创建状态组，保留已有设备微调");
  if (
    p.controls?.some(
      (c) =>
        c.targets.some((t) => t.layerId === id) ||
        c.hideWhenChangedFromDefault?.includes(id)||Object.values(c.sourceIcons||{}).some(ids=>ids.includes(id)),
    ) ||
    p.layers.some((l) => l.sourceLabelFor === id) ||
    original.sourceLabelFor
  )
    throw Error("该控件带外部配置或数据标签引用，请先保留其原结构");
  const states = statePresets[preset];
  const copies = states.map((s) => ({
    ...structuredClone(original),
    id: uid(),
    name: s.name,
    visibility: {
      ...s.condition,
      missingVisible: false,
      aod: "evaluate" as const,
    },
    color: s.color,
    threshold: false,
    ...(original.image ? { assetId: original.assetId || original.id } : {}),
  }));
  const interim = {
    ...p,
    layers: p.layers.flatMap((l) => (l.id === id ? copies : [l])),
  };
  const next = combineLayers(
      interim,
      copies.map((l) => l.id),
    ),
    root = next.layers.find(
      (l) =>
        l.kind === "widget" &&
        l.compound?.layers.some((c) => c.id === copies[0].id),
    )!;
  root.name = original.name + "状态组";
  root.compound!.parts = copies.map((c, i) => ({
    id: "state-" + i,
    name: states[i].name,
    layerIds: [c.id],
    enabled: true,
  }));
  if(p.themes)next.themes={...p.themes,presets:p.themes.presets.map(t=>({...t,layerIds:t.layerIds.map(layerId=>layerId===id?root.id:layerId)}))};
  return next;
}
export function setPartCondition(
  l: Layer,
  id: string,
  value: VisibilityCondition | undefined,
): Partial<Layer> {
  validateVisibility(value);
  const b = l.compound!,
    part = b.parts.find((p) => p.id === id);
  if (!part) throw Error("状态部件不存在");
  return {
    compound: {
      ...b,
      layers: b.layers.map((c) =>
        part.layerIds.includes(c.id)
          ? { ...c, visibility: value ? { ...value } : undefined }
          : c,
      ),
    },
  };
}
export function setPartColor(
  l: Layer,
  id: string,
  color: string,
): Partial<Layer> {
  if (!/^#[a-f0-9]{6}$/i.test(color)) throw Error("状态颜色无效");
  const b = l.compound!,
    part = b.parts.find((p) => p.id === id);
  if (!part) throw Error("状态部件不存在");
  const targets = b.controls.filter(
    (c) =>
      c.type === "color" &&
      c.targets.some(
        (t) => part.layerIds.includes(t.layerId) && t.property === "color",
      ),
  );
  if (
    targets.some((c) =>
      c.targets.some(
        (t) => !part.layerIds.includes(t.layerId) || t.property !== "color",
      ),
    )
  )
    throw Error("主题色还控制其他部件，请使用主题色配置或选择独立颜色部件");
  return {
    compound: {
      ...b,
      controlValues: {
        ...b.controlValues,
        ...Object.fromEntries(targets.map((c) => [c.id, color])),
      },
      layers: b.layers.map((c) =>
        part.layerIds.includes(c.id)
          ? {
              ...c,
              color,
              threshold: c.kind === "metric" ? false : c.threshold,
            }
          : c,
      ),
    },
  };
}

export function setPartImage(
  l: Layer,
  id: string,
  data: string,
): Partial<Layer> {
  if (
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data) ||
    data.length > 16 * 1024 * 1024
  )
    throw Error("状态图片须为本地PNG");
  const b = l.compound!,
    part = b.parts.find((p) => p.id === id);
  if (!part) throw Error("状态部件不存在");
  const images = b.layers.filter(
    (c) => part.layerIds.includes(c.id) && c.kind === "image",
  );
  if (images.length !== 1) throw Error("请选择恰好包含一张图片的状态部件");
  return {
    compound: {
      ...b,
      layers: b.layers.map((c) =>
        c.id === images[0].id
          ? {
              ...c,
              image: data,
              assetId: uid(),
              imageFullColor: true,
              libraryIcon: undefined,
              weatherIcon: undefined,
            }
          : c,
      ),
    },
  };
}
