import { typographyFixture } from "./bitmapTypographyFixture";
import { createBitmapFontAsset } from "../../src/bitmapFonts";
import { bitmapLayerPatch } from "../../src/bitmapFontLayout";
import { fontPatch } from "../../src/fontLibrary";
import { devices } from "../../src/devices";
import {
  enableDevices,
  addDevice,
  reconcileDevices,
} from "../../src/multiDevice";
export async function multiFontFixture() {
  let p = await typographyFixture();
  p.name = "MultiFont";
  p.layers = [{ ...p.layers[0], ...fontPatch("sonar_label_font"), aod: true }];
  const first = p.bitmapFonts![0];
  const second = createBitmapFontAsset(
    first.descriptor
      .replace("GFC Synthetic Typography", "GFC Synthetic Typography Small")
      .replace("size=12", "size=10"),
    first.atlasData,
    first.license,
    first.source,
  );
  p.bitmapFonts!.push(second);
  p = enableDevices(p);
  p = addDevice(
    p,
    devices.find((d) => d.id === "venu441mm")!,
  );
  const layer = {
    ...p.layers[0],
    ...bitmapLayerPatch(p, second.id),
    bitmapTracking: 1,
    bitmapTabular: true,
    bitmapBaselineShift: -1,
    bitmapLineHeight: 16,
  };
  return reconcileDevices(p, {
    ...p,
    layers: [layer],
    revision: p.revision + 1,
  })!;
}
