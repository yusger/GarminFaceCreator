import type { Layer, Project } from "./domain";
import { captureWatchface } from "./watchfaceCapture";
import { bitmapLayerPatch } from "./bitmapFontLayout";
// Preserve the original SVG font's vertical centre when changing representation to fixed glyphs.
// Measures actual browser raster output; never changes the original layer geometry.
export async function rasterBaselineShift(
  p: Project,
  source: Layer,
  fontId: string,
): Promise<number> {
  const probe: Layer = {
    ...source,
    kind: "text",
    x: 0,
    y: 0,
    w: 454,
    h: 454,
    text: "0123456789",
    textAlign: "center",
    color: "#FFFFFF",
    opacity: 1,
    activeVisible: true,
    aod: false,
    rotation: 0,
    threshold: false,
    sourceLabelFor: undefined,
  };
  const candidate = { ...probe, ...bitmapLayerPatch(p, fontId) };
  const state = {
    ...p,
    themes: undefined,
    multiDevice: undefined,
    fontRoles: undefined,
    componentStyles: undefined,
    controls: [],
    controlValues: {},
    backgroundColor: "#000000",
  };
  const data = {
    time: "09:41",
    heartRate: 72,
    steps: 4500,
    battery: 78,
    seconds: 0,
  };
  const bounds = async (l: Layer) => {
    const frame = await captureWatchface({ ...state, layers: [l] }, data),
      image = new Image();
    image.src = frame.data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = canvas.height,
      bottom = -1;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 24) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    if (bottom < top) throw Error("字体基线探针未产生有效字形");
    return { top, bottom };
  };
  const a = await bounds(probe),
    b = await bounds(candidate),
    shift = Math.round((a.top + a.bottom - b.top - b.bottom) / 2);
  if (Math.abs(shift) > 16)
    throw Error("字体表示变化超过16物理像素，请人工确认字体指标");
  return shift;
}
