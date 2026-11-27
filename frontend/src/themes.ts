import type { Project, Layer } from "./domain.ts";
export type ThemePreset = {
  id: string;
  name: string;
  layerIds: string[];
  controlIds: string[];
  backgroundColor: string;
  version: string;
};
export type ThemeSet = {
  version: 1;
  activeId: string;
  defaultId: string;
  presets: ThemePreset[];
};
export function activeTheme(p: Pick<Project, "themes">) {
  return (
    p.themes?.presets.find((t) => t.id === p.themes!.activeId) ||
    p.themes?.presets.find((t) => t.id === p.themes!.defaultId)
  );
}
export function themeIndex(p: Pick<Project, "themes">) {
  return p.themes?.presets.findIndex((t) => t.id === activeTheme(p)?.id) ?? 0;
}
export function layerThemeIndex(p: Pick<Project, "themes">, id: string) {
  return p.themes?.presets.findIndex((t) => t.layerIds.includes(id)) ?? -1;
}
export function themeLayers(p: Project) {
  const current = activeTheme(p);
  return current
    ? p.layers.filter(
        (l) => layerThemeIndex(p, l.id) < 0 || current.layerIds.includes(l.id),
      )
    : p.layers;
}
export function themeControls(p: Project) {
  const current = activeTheme(p);
  return current
    ? (p.controls || []).filter(
        (c) =>
          !p.themes!.presets.some((t) => t.controlIds.includes(c.id)) ||
          current.controlIds.includes(c.id),
      )
    : p.controls || [];
}
export function validateThemes(p: Project) {
  const set = p.themes;
  if (set === undefined) return;
  if (
    !set ||
    set.version !== 1 ||
    !Array.isArray(set.presets) ||
    set.presets.length < 2 ||
    set.presets.length > 8 ||
    typeof set.activeId !== "string" ||
    set.activeId.length > 80
  )
    throw Error("主题预设格式无效");
  const ids = new Set(),
    layers = new Set(),
    controls = new Set();
  for (const t of set.presets) {
    if (
      !t ||
      !/^[a-z][a-z0-9-]{0,79}$/.test(t.id) ||
      ids.has(t.id) ||
      typeof t.name !== "string" ||
      !t.name.trim() ||
      t.name.length > 80 ||
      typeof t.version !== "string" ||
      !/^\d+\.\d+\.\d+$/.test(t.version) ||
      !/^#[0-9a-f]{6}$/i.test(t.backgroundColor) ||
      !Array.isArray(t.layerIds) ||
      !Array.isArray(t.controlIds) ||
      t.layerIds.length > 200 ||
      t.controlIds.length > 40
    )
      throw Error("主题身份、外观或引用无效");
    ids.add(t.id);
    for (const id of t.layerIds) {
      if (
        typeof id !== "string" ||
        layers.has(id) ||
        !p.layers.some((l) => l.id === id)
      )
        throw Error("主题图层缺失或重复归属");
      layers.add(id);
    }
    for (const id of t.controlIds) {
      const c = p.controls?.find((c) => c.id === id);
      if (
        typeof id !== "string" ||
        controls.has(id) ||
        !c ||
        c.targets.some((x) => !t.layerIds.includes(x.layerId))
      )
        throw Error("主题配置缺失或跨主题引用");
      controls.add(id);
    }
  }
  if (!ids.has(set.defaultId)) throw Error("主题默认项不存在");
  for (const c of p.controls || [])
    if (!controls.has(c.id) && c.targets.some((x) => layers.has(x.layerId)))
      throw Error("主题内部配置必须归属于该主题");
}
export function selectTheme(p: Project, id: string): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后切换主题");
  if (!p.themes?.presets.some((t) => t.id === id)) throw Error("主题不存在");
  return {
    ...p,
    themes: { ...p.themes, activeId: id },
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
}
export function resetTheme(p: Project): Project {
  const theme = activeTheme(p);
  if (!theme) return p;
  const values = Object.fromEntries(
    Object.entries(p.controlValues || {}).filter(
      ([id]) => !theme.controlIds.includes(id),
    ),
  );
  return { ...selectTheme(p, theme.id), controlValues: values };
}
// Layer-list operations operate only on the visible preset; other presets retain exact identities and order.
export function mergeThemeLayers(p: Project, edited: Layer[]) {
  if (!p.themes) return edited;
  const shown = new Set(themeLayers(p).map((l) => l.id)),
    incoming = new Map(edited.map((l) => [l.id, l]));
  const result = p.layers.flatMap((l) =>
    shown.has(l.id) ? (incoming.has(l.id) ? [incoming.get(l.id)!] : []) : [l],
  );
  for (const l of edited)
    if (!p.layers.some((x) => x.id === l.id)) result.push(l);
  return result;
}
