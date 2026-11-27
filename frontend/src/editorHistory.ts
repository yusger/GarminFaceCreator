import type { Layer, Project } from "./domain";
export type EditorFrame = Pick<
  Project,
  "layers" | "controls" | "controlValues" | "backgroundColor"
>;
export function editorFrame(p: Project, layers = p.layers): EditorFrame {
  return structuredClone({
    layers,
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
    controls,
    controlValues: p.controlValues
      ? Object.fromEntries(
          Object.entries(p.controlValues).filter(([id]) => valid.has(id)),
        )
      : undefined,
  };
}
