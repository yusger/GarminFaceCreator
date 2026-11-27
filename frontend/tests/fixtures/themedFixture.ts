import {project,layer} from "../../src/domain";
export function themedFixture() {
  const p = project("ThemeFixture", true);
  p.layers = [
    { ...layer("time"), id: "apex-time", color: "#FF6A1A" },
    { ...layer("time"), id: "trail-time", color: "#FFC04A", y: 80 },
  ];
  p.controls = p.layers.map((l, i) => ({
    id: i ? "trail-color" : "apex-color",
    label: i ? "Trail Color" : "Apex Color",
    type: "color" as const,
    default: l.color,
    targets: [{ layerId: l.id, property: "color" as const }],
  }));
  p.themes = {
    version: 1,
    activeId: "apex",
    defaultId: "apex",
    presets: [
      {
        id: "apex",
        name: "Apex",
        version: "1.0.0",
        backgroundColor: "#0E1319",
        layerIds: ["apex-time"],
        controlIds: ["apex-color"],
      },
      {
        id: "trail",
        name: "Trail",
        version: "1.0.0",
        backgroundColor: "#17140E",
        layerIds: ["trail-time"],
        controlIds: ["trail-color"],
      },
    ],
  };
  return p;
}
