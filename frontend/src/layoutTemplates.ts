import catalog from "./layoutTemplateCatalog.json" with { type: "json" };
import { layer, uid, type Layer, type Project } from "./domain";
export type LayoutTemplate = {
  id: string;
  version: string;
  name: string;
  mode: "DIGITAL" | "ANALOG" | "HYBRID";
  description: string;
  visualKit?: {
    targets: string[];
    fonts: string[];
    colorRoles: {
      id: string;
      label: string;
      color: string;
      semantic?:import("./projectControls").ProjectControl["semantic"];
      layerIds: string[];
    }[];
    aodGuide: string;
  };
  defaultSources: string[];
  backgroundColor: string;
  layers: Array<Partial<Layer> & { kind: Layer["kind"] }>;
};
export const layoutTemplates = catalog as unknown as LayoutTemplate[];
export function layoutTemplate(id?: string) {
  return layoutTemplates.find((t) => t.id === id);
}
export function applyTemplate(p: Project, id: string): Project {
  const template = layoutTemplate(id);
  if (!template) throw Error("布局模板不存在");
  if (
    template.visualKit &&
    !template.visualKit.targets.includes(p.target || "venu445mm")
  )
    throw Error("此视觉套件仅支持Venu 4两种尺寸");
  const ids = new Map(template.layers.map((l) => [l.id, uid()]));
  return {
    ...p,
    ...(template.visualKit
      ? {
          controls: template.visualKit.colorRoles.map((role) => ({
            id: "kit-" + role.id,
            label: role.label,
            type: "color" as const,
            default: role.color,
            semantic:role.semantic,
            targets: role.layerIds.map((id) => ({
              layerId: ids.get(id)!,
              property: "color" as const,
            })),
          })),
          controlValues: {},
        }
      : {}),
    backgroundColor: template.backgroundColor,
    layers: template.layers.map((def) => ({
      ...layer(def.kind),
      ...structuredClone(def),
      id: ids.get(def.id)!,
    })),
  };
}
