import catalog from "./layoutTemplateCatalog.json" with { type: "json" };
import { layer, uid, type Layer, type Project } from "./domain";
export type LayoutTemplate = {
  id: string;
  version: string;
  name: string;
  mode: "DIGITAL" | "ANALOG" | "HYBRID";
  description: string;
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
  return {
    ...p,
    backgroundColor: template.backgroundColor,
    layers: template.layers.map((def) => ({
      ...layer(def.kind),
      ...structuredClone(def),
      id: uid(),
    })),
  };
}
