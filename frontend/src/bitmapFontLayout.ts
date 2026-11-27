import { bitmapFontInfo, type BitmapFontInfo } from "./bitmapFonts.ts";
import type { Project, Layer } from "./domain.ts";
import { generationDevice } from "./devices.ts";
export function bitmapTextLayout(
  info: BitmapFontInfo,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  align = "center",
) {
  const chars = [...text],
    kern = (a: number, b: number) =>
      info.kernings.find((k) => k.first === a && k.second === b)?.amount || 0;
  let total = 0,
    prev = -1;
  for (const c of chars) {
    const id = c.codePointAt(0)!;
    total +=
      (prev < 0 ? 0 : kern(prev, id)) +
      (info.glyphs[id]?.xadvance ?? Math.ceil(info.size / 2));
    prev = id;
  }
  const left = Math.trunc(
      x +
        (align === "left"
          ? 0
          : align === "right"
            ? w - total
            : (w - total) / 2),
    ),
    top = Math.trunc(y + (h - info.lineHeight) / 2);
  let cursor = left;
  prev = -1;
  return {
    width: total,
    left,
    top,
    glyphs: chars.map((c) => {
      const id = c.codePointAt(0)!,
        g = info.glyphs[id];
      if (prev >= 0) cursor += kern(prev, id);
      const at = {
        char: c,
        id,
        x: cursor + (g?.xoffset || 0),
        y: top + (g?.yoffset || 0),
        glyph: g,
      };
      cursor += g?.xadvance ?? Math.ceil(info.size / 2);
      prev = id;
      return at;
    }),
  };
}
export function bitmapLayerPatch(p: Project, fontId: string): Partial<Layer> {
  const f = p.bitmapFonts?.find((f) => f.id === fontId);
  if (!f) throw Error("位图字体不存在");
  const info = bitmapFontInfo(f),
    size = (info.size * 454) / generationDevice(p).screenWidth;
  return {
    bitmapFontId: f.id,
    customFont: undefined,
    garminFont: "auto",
    fontWeight: 400,
    size,
    aodSize: size,
  };
}
