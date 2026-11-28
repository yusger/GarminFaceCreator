import { roleFixture } from "./roleFixture";
import { createFontRole } from "../../src/fontRoles";
import { createDataSlot } from "../../src/dataSlots";
import { defaultThresholds } from "../../src/thresholds";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
async function fixture(target: string) {
  let p = roleFixture();
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  p = createFontRole(
    p,
    "role-body",
    "Body",
    "sonar_label_font",
    p.layers.map((l) => l.id),
  );
  p.layers[0] = {
    ...p.layers[0],
    kind: "metric",
    source: "heartRate",
    threshold: true,
    thresholdRules: defaultThresholds("heartRate", "#FFFFFF"),
  };
  p = createDataSlot(p, [p.layers[0].id], "Reading");
  p.controls!.push(
    {
      id: "danger",
      label: "Danger",
      type: "color",
      semantic: "danger",
      default: "#CC1122",
      targets: [
        { layerId: p.layers[0].id, property: "thresholdRules.2.color" },
      ],
    },
    {
      id: "warning",
      label: "Warning",
      type: "color",
      semantic: "warning",
      default: "#DDAA00",
      targets: [
        { layerId: p.layers[0].id, property: "thresholdRules.1.color" },
      ],
    },
  );
  return p;
}
Object.assign(window, {
  gfcRoles: { fixture, localGenerate, preparedCodeFiles, preparedAssets },
});
