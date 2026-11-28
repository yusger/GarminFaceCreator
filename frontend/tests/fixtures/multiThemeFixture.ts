import { themedFixture } from "./themedFixture";
import { typographyFixture } from "./bitmapTypographyFixture";
import { fontPatch } from "../../src/fontLibrary";
import { bitmapLayerPatch } from "../../src/bitmapFontLayout";
import {
  enableDevices,
  addDevice,
  reconcileDevices,
} from "../../src/multiDevice";
import { devices } from "../../src/devices";
import type { Project } from "../../src/domain";
export async function multiThemeFixture() {
  let p = themedFixture();
  p.name = "MultiTheme";
  p.layers = p.layers.map((l) => ({ ...l, ...fontPatch("sonar_label_font") }));
  p.bitmapFonts = (await typographyFixture()).bitmapFonts;
  p = addDevice(
    enableDevices(p),
    devices.find((d) => d.id === "venu441mm")!,
  );
  return reconcileDevices(p, {
    ...p,
    layers: p.layers.map((l, i) =>
      i ? l : { ...l, ...bitmapLayerPatch(p, p.bitmapFonts![0].id), x: 123 },
    ),
    controlValues: { "apex-color": "#123456" },
    revision: p.revision + 1,
  })!;
}
export function themeDefinition(p: Project): Project {
  const n = structuredClone(p);
  n.multiDevice = undefined;
  n.layers = structuredClone(p.multiDevice!.master);
  n.layers[0].y = 180;
  n.bitmapFonts = [];
  n.themes!.presets.forEach((t) => (t.version = "1.1.0"));
  return n;
}
