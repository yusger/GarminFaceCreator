import type { Layer, Project } from "./domain";
export type EditorFrame = Pick<
  Project,
  "layers" | "controls" | "controlValues" | "backgroundColor" | "localFonts" | "themes"
>;
export function editorFrame(p: Project, layers = p.layers): EditorFrame {
  return structuredClone({
    layers,
    localFonts:p.localFonts,
    themes:p.themes,
    backgroundColor: p.backgroundColor,
    controls: p.controls,
    controlValues: p.controlValues,
  });
}
export function withEditorLayers(p: Project, layers: Layer[]): Project {
  const ids = new Set(layers.map((l) => l.id));
  const controls = p.controls
    ?.map((c) => ({
      ...c,
      targets: c.targets.filter((t) => ids.has(t.layerId)),
      preserveFormatFor:c.preserveFormatFor?.filter(id=>ids.has(id)),
      hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.filter((id) =>
        ids.has(id),
      ),
    }))
    .filter((c) => c.targets.length);
  const valid = new Set(controls?.map((c) => c.id));
  return {
    ...p,
    layers,
    ...(p.themes?{themes:{...p.themes,presets:p.themes.presets.map(t=>({...t,layerIds:[...t.layerIds.filter(id=>ids.has(id)),...(t.id===p.themes!.activeId?layers.filter(l=>!p.layers.some(old=>old.id===l.id)).map(l=>l.id):[])],controlIds:t.controlIds.filter(id=>valid.has(id))}))}}:{}),
    controls,
    controlValues: p.controlValues
      ? Object.fromEntries(
          Object.entries(p.controlValues).filter(([id]) => valid.has(id)),
        )
      : undefined,
  };
}
