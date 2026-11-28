import type { Project, Layer, Kind } from "./domain.ts";
import { uid } from "./domain.ts";
import {
  compoundStyleKeys,
  validateCompoundOverrides,
  type CompoundStyle,
} from "./compound.ts";
import { commitAppearanceChange } from "./fontRoles.ts";
import { resolveControls } from "./projectControls.ts";
export type ComponentStyle = {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  slots: { key: string; name: string; kind: Kind; style: CompoundStyle }[];
};
export type ComponentStyleLink = {
  id: string;
  version: number;
  bindings: Record<string, string>;
};
const pick = (l: Layer) =>
  Object.fromEntries(
    compoundStyleKeys.filter((k) => l[k] !== undefined).map((k) => [k, l[k]]),
  ) as CompoundStyle;
const canonical = (v: unknown) =>
  JSON.stringify(v, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
function ownKeys(value: unknown, allowed: string[]) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((k) => allowed.includes(k))
  );
}
function validateDef(d: ComponentStyle) {
  if (
    !ownKeys(d, ["id", "name", "version", "width", "height", "slots"]) ||
    typeof d.id !== "string" ||
    !/^[a-z][a-z0-9-]{0,79}$/.test(d.id) ||
    typeof d.name !== "string" ||
    !d.name.trim() ||
    d.name.length > 80 ||
    !Number.isSafeInteger(d.version) ||
    d.version < 1 ||
    d.version > 100000 ||
    ![d.width, d.height].every(
      (v) => Number.isFinite(v) && v > 0 && v <= 454,
    ) ||
    !Array.isArray(d.slots) ||
    !d.slots.length ||
    d.slots.length > 40
  )
    throw Error("组件主样式定义无效");
  const keys = new Set();
  for (const s of d.slots) {
    if (
      !ownKeys(s, ["key", "name", "kind", "style"]) ||
      typeof s.key !== "string" ||
      !/^[A-Za-z0-9_-]{1,120}$/.test(s.key) ||
      ["__proto__", "constructor", "prototype"].includes(s.key) ||
      keys.has(s.key) ||
      typeof s.name !== "string" ||
      s.name.length > 120 ||
      ![
        "text",
        "metric",
        "rect",
        "circle",
        "line",
        "meter",
        "time",
        "date",
        "image",
        "hand",
        "ring",
        "polygon",
        "arcText",
      ].includes(s.kind) ||
      !ownKeys(s.style, [...compoundStyleKeys]) ||
      ["x", "y", "w", "h", "size", "rotation", "color", "aod", "hidden"].some(
        (k) => !Object.hasOwn(s.style, k),
      ) ||
      [s.style.w, s.style.h, s.style.size].some(
        (v) => typeof v !== "number" || v <= 0 || v > 908,
      ) ||
      [s.style.x, s.style.y].some(
        (v) => typeof v !== "number" || Math.abs(v) > 908,
      ) ||
      typeof s.style.rotation !== "number" ||
      Math.abs(s.style.rotation) > 360
    )
      throw Error("组件样式插槽无效");
    keys.add(s.key);
    validateCompoundOverrides(
      { kind: "widget", compound: { layers: [{ id: s.key }] } } as Layer,
      { [s.key]: s.style },
    );
  }
}
export function validateComponentStyles(p: Project) {
  if (
    p.componentStyles !== undefined &&
    (!Array.isArray(p.componentStyles) || p.componentStyles.length > 24)
  )
    throw Error("项目最多24个组件主样式");
  const ids = new Set();
  for (const d of p.componentStyles || []) {
    validateDef(d);
    if (ids.has(d.id)) throw Error("组件主样式身份重复");
    ids.add(d.id);
  }
  for (const l of p.layers) {
    const link = l.componentStyle;
    if (link === undefined) continue;
    const d = p.componentStyles?.find((d) => d.id === link.id);
    if (
      !ownKeys(link, ["id", "version", "bindings"]) ||
      !d ||
      l.kind !== "widget" ||
      !l.compound ||
      link.version !== d.version ||
      !ownKeys(
        link.bindings,
        d.slots.map((s) => s.key),
      ) ||
      Object.keys(link.bindings).length !== d.slots.length ||
      Object.values(link.bindings).some(
        (v) =>
          typeof v !== "string" ||
          !/^[A-Za-z0-9_-]{1,120}$/.test(v) ||
          ["__proto__", "constructor", "prototype"].includes(v),
      ) ||
      new Set(Object.values(link.bindings)).size !== d.slots.length ||
      l.compound.layers.length !== d.slots.length ||
      l.compound.width !== d.width ||
      l.compound.height !== d.height
    )
      throw Error("组件样式关联缺失、版本或结构不兼容");
    for (const s of d.slots) {
      const c = l.compound.layers.find((c) => c.id === link.bindings[s.key]);
      if (!c || c.kind !== s.kind || canonical(pick(c)) !== canonical(s.style))
        throw Error("组件样式插槽映射或基础外观不一致");
    }
  }
}
function editable(p: Project, l?: Layer) {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后编辑组件主样式");
  if (l && (l.locked || l.kind !== "widget" || !l.compound))
    throw Error("请选择未锁定的复合控件");
}
function appearance(l: Layer, p: Project) {
  const b = l.compound!,
    resolved = resolveControls({
      ...p,
      themes: undefined,
      multiDevice: undefined,
      fontRoles: undefined,
      layers: b.layers,
      controls: b.controls,
      controlValues: b.controlValues,
    }).layers;
  return b.layers.map((c) => ({
    ...c,
    ...pick(resolved.find((r) => r.id === c.id) || c),
    ...l.compoundOverrides?.[c.id],
  }));
}
function apply(
  l: Layer,
  d: ComponentStyle,
  bindings: Record<string, string>,
): Layer {
  const b = l.compound!;
  if (
    Object.values(bindings).some(
      (v) =>
        typeof v !== "string" ||
        !/^[A-Za-z0-9_-]{1,120}$/.test(v) ||
        ["__proto__", "constructor", "prototype"].includes(v),
    )
  )
    throw Error("组件插槽身份无效");
  if (
    b.width !== d.width ||
    b.height !== d.height ||
    b.layers.length !== d.slots.length ||
    Object.keys(bindings).length !== d.slots.length ||
    new Set(Object.values(bindings)).size !== d.slots.length
  )
    throw Error("组件尺寸基准或插槽数量不兼容，请手动映射完整结构");
  const layers = b.layers.map((c) => {
    const slot = d.slots.find((s) => bindings[s.key] === c.id);
    if (!slot || slot.kind !== c.kind)
      throw Error("组件插槽须一一对应且类型一致");
    const base = { ...c };
    for (const key of compoundStyleKeys) delete (base as any)[key];
    return { ...base, ...slot.style };
  });
  const controls = b.controls.map((c) => {
    if (c.type !== "color") return c;
    const colors = c.targets
      .filter((t) => t.property === "color")
      .map((t) => layers.find((l) => l.id === t.layerId)?.color)
      .filter(Boolean);
    return colors.length && new Set(colors).size === 1
      ? { ...c, default: colors[0]! }
      : c;
  });
  return {
    ...l,
    componentStyle: { id: d.id, version: d.version, bindings: { ...bindings } },
    compound: { ...b, layers, controls },
  };
}
export function createComponentStyle(
  p: Project,
  layerId: string,
  name: string,
  id = "style-" + uid(),
): Project {
  const l = p.layers.find((l) => l.id === layerId);
  editable(p, l);
  if (!l || l.componentStyle) throw Error("请选择尚未关联主样式的复合控件");
  if (p.componentStyles?.some((d) => d.id === id))
    throw Error("主样式身份已存在");
  const d: ComponentStyle = {
    id,
    name: name.trim(),
    version: 1,
    width: l.compound!.width,
    height: l.compound!.height,
    slots: appearance(l, p).map((c) => ({
      key: c.id,
      name: c.name,
      kind: c.kind,
      style: pick(c),
    })),
  };
  validateDef(d);
  const next = {
    ...p,
    componentStyles: [...(p.componentStyles || []), d],
    layers: p.layers.map((c) =>
      c.id === l.id
        ? apply(c, d, Object.fromEntries(d.slots.map((s) => [s.key, s.key])))
        : c,
    ),
  };
  return commitAppearanceChange(p, next);
}
export function bindComponentStyle(
  p: Project,
  layerId: string,
  styleId: string,
  bindings: Record<string, string>,
): Project {
  const l = p.layers.find((l) => l.id === layerId),
    d = p.componentStyles?.find((d) => d.id === styleId);
  editable(p, l);
  if (!l || !d) throw Error("组件或主样式不存在");
  if (l.componentStyle) throw Error("先脱离原主样式再关联");
  return commitAppearanceChange(p, {
    ...p,
    layers: p.layers.map((c) => (c.id === l.id ? apply(c, d, bindings) : c)),
  });
}
export function publishComponentStyle(p: Project, layerId: string): Project {
  const source = p.layers.find((l) => l.id === layerId),
    old = p.componentStyles?.find((d) => d.id === source?.componentStyle?.id);
  editable(p, source);
  if (!source || !old) throw Error("组件未关联主样式");
  const members = p.layers.filter((l) => l.componentStyle?.id === old.id);
  if (members.some((l) => l.locked))
    throw Error("样式包含锁定实例，不能整体更新");
  const current = appearance(source, p),
    d = {
      ...old,
      version: old.version + 1,
      slots: old.slots.map((s) => ({
        ...s,
        style: pick(
          current.find((l) => l.id === source.componentStyle!.bindings[s.key])!,
        ),
      })),
    };
  validateDef(d);
  const next = {
    ...p,
    componentStyles: p.componentStyles!.map((s) => (s.id === d.id ? d : s)),
    layers: p.layers.map((l) =>
      l.componentStyle?.id === d.id
        ? apply(l, d, l.componentStyle.bindings)
        : l,
    ),
  };
  // Publishing promotes this instance's appearance overrides into the new default; other instances keep theirs.
  next.layers = next.layers.map((l) =>
    l.id === source.id ? { ...l, compoundOverrides: undefined } : l,
  );
  return commitAppearanceChange(p, next);
}
export function detachComponentStyle(p: Project, layerId: string): Project {
  const l = p.layers.find((l) => l.id === layerId);
  editable(p, l);
  if (!l?.componentStyle) throw Error("组件未关联主样式");
  return commitAppearanceChange(p, {
    ...p,
    layers: p.layers.map((c) =>
      c.id === l.id ? { ...c, componentStyle: undefined } : c,
    ),
  });
}
export function deleteComponentStyle(p: Project, id: string): Project {
  editable(p);
  if (p.layers.some((l) => l.componentStyle?.id === id))
    throw Error("主样式仍被实例引用，请先脱离关联");
  if (!p.componentStyles?.some((d) => d.id === id)) throw Error("主样式不存在");
  return commitAppearanceChange(p, {
    ...p,
    componentStyles: p.componentStyles.filter((d) => d.id !== id),
  });
}
// A private inspector appearance edit becomes an instance override; data/control/part state remain independent.
export function captureComponentStyleEdits(
  before: Project,
  after: Project,
): Project {
  if (after.multiDevice?.scope === "device") return after;
  return {
    ...after,
    layers: after.layers.map((l) => {
      const prior = before.layers.find((c) => c.id === l.id),
        link = l.componentStyle,
        d = after.componentStyles?.find((d) => d.id === link?.id);
      if (
        !prior?.componentStyle ||
        !link ||
        !d ||
        prior.componentStyle.id !== link.id ||
        prior.componentStyle.version !== link.version ||
        !l.compound
      )
        return l;
      const overrides = { ...l.compoundOverrides };
      const layers = l.compound.layers.map((c) => {
        const old = prior.compound?.layers.find((a) => a.id === c.id);
        if (!old) return c;
        const changed = compoundStyleKeys.filter(
          (k) => canonical(c[k]) !== canonical(old[k]),
        );
        if (!changed.length) return c;
        const slot = d.slots.find((s) => link.bindings[s.key] === c.id);
        if (!slot) return c;
        const patch = { ...overrides[c.id] } as Record<string, unknown>;
        for (const k of changed) {
          if (c[k] === undefined) delete patch[k];
          else patch[k] = c[k];
        }
        overrides[c.id] = patch as CompoundStyle;
        const out = { ...c };
        for (const k of compoundStyleKeys) delete (out as any)[k];
        return { ...out, ...slot.style };
      });
      return {
        ...l,
        compound: { ...l.compound, layers },
        compoundOverrides: overrides,
      };
    }),
  };
}
