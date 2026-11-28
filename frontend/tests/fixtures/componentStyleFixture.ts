import { project, layer } from "../../src/domain.ts";
import { makeParts } from "../../src/compound.ts";
export function componentStyleFixture() {
  const p = project("ComponentStyles", true);
  p.layers = [
    {
      ...layer("widget"),
      id: "widget-a",
      widgetOrigin: {
        id: "gfc-style-fixture",
        version: "1.0.0",
        license: "CC0-1.0",
        notice: "Original synthetic GFC test fixture",
      },
      name: "Styled capsule",
      x: 50,
      y: 150,
      w: 300,
      h: 100,
      rotation: 0,
      compound: {
        version: 1,
        width: 240,
        height: 80,
        layers: [
          {
            ...layer("rect"),
            id: "bg-a",
            name: "Background",
            x: 0,
            y: 0,
            w: 240,
            h: 80,
            size: 20,
            color: "#112233",
            threshold: false,
          },
          {
            ...layer("metric"),
            id: "data-a",
            name: "Reading",
            x: 20,
            y: 20,
            w: 200,
            h: 40,
            size: 30,
            color: "#FFFFFF",
            source: "heartRate",
            threshold: false,
            metricDecoration: false,
          },
        ],
        controls: [
          {
            id: "widget-source",
            label: "Reading source",
            type: "dataSource",
            default: "heartRate",
            options: ["heartRate", "battery"],
            targets: [{ layerId: "data-a", property: "source" }],
          },
        ],
        parts: [],
      },
    },
  ];
  p.layers[0].compound!.parts = makeParts(p.layers[0].compound!.layers);
  return p;
}
