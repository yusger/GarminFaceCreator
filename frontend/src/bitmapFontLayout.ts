import { bitmapFontInfo, type BitmapFontInfo } from "./bitmapFonts.ts";
import type { Project, Layer } from "./domain.ts";
import { generationDevice } from "./devices.ts";
export type BitmapTypography = Pick<
  Layer,
  | "bitmapTracking"
  | "bitmapTabular"
  | "bitmapBaselineShift"
  | "bitmapLineHeight"
>;
import { bitmapTypographyReset } from "./bitmapTypographyFields.ts";
export { bitmapTypographyReset } from "./bitmapTypographyFields.ts";
export function bitmapTextLayout(
  info: BitmapFontInfo,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  align = "center",
  options: BitmapTypography = {},
) {
  const chars = [...text],
    tracking = options.bitmapTracking || 0,
    tabular = !!options.bitmapTabular,
    digit = (id: number) => id >= 48 && id <= 57,
    cell = Math.max(
      0,
      ...Array.from(
        { length: 10 },
        (_, i) => info.glyphs[48 + i]?.xadvance || 0,
      ),
    ),
    advance = (id: number) =>
      tabular && digit(id)
        ? cell
        : (info.glyphs[id]?.xadvance ?? Math.ceil(info.size / 2)),
    kern = (a: number, b: number) =>
      tabular && (digit(a) || digit(b))
        ? 0
        : info.kernings.find((k) => k.first === a && k.second === b)?.amount ||
          0;
  let total = 0,
    prev = -1;
  for (const c of chars) {
    const id = c.codePointAt(0)!;
    total += (prev < 0 ? 0 : kern(prev, id) + tracking) + advance(id);
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
    lineHeight = options.bitmapLineHeight || info.lineHeight,
    top =
      Math.trunc(y + (h - lineHeight) / 2) + (options.bitmapBaselineShift || 0);
  let cursor = left;
  prev = -1;
  const glyphs = chars.map((c) => {
    const id = c.codePointAt(0)!,
      g = info.glyphs[id];
    if (prev >= 0) cursor += kern(prev, id) + tracking;
    const at = {
      char: c,
      id,
      x:
        cursor +
        (g?.xoffset || 0) +
        (tabular && digit(id)
          ? Math.trunc((cell - (g?.xadvance || 0)) / 2)
          : 0),
      y: top + (g?.yoffset || 0),
      glyph: g,
    };
    cursor += advance(id);
    prev = id;
    return at;
  });
  const ink = glyphs.filter((p) => p.glyph?.width && p.glyph?.height);
  return {
    width: total,
    left,
    top,
    lineHeight,
    baseline: top + info.base,
    glyphs,
    inkBounds: ink.length
      ? {
          x: Math.min(...ink.map((p) => p.x)),
          y: Math.min(...ink.map((p) => p.y)),
          right: Math.max(...ink.map((p) => p.x + p.glyph!.width)),
          bottom: Math.max(...ink.map((p) => p.y + p.glyph!.height)),
        }
      : undefined,
  };
}
export function bitmapLayerPatch(p: Project, fontId: string): Partial<Layer> {
  const f = p.bitmapFonts?.find((f) => f.id === fontId);
  if (!f) throw Error("位图字体不存在");
  const info = bitmapFontInfo(f),
    size = (info.size * 454) / generationDevice(p).screenWidth;
  return {
    ...bitmapTypographyReset,
    bitmapFontId: f.id,
    customFont: undefined,
    garminFont: "auto",
    fontWeight: 400,
    size,
    aodSize: size,
  };
}
export function bitmapLayerBaseline(p: Project, l: Layer) {
  const f = p.bitmapFonts?.find((f) => f.id === l.bitmapFontId);
  if (!f) throw Error("基线对齐需要位图字体");
  const scale = generationDevice(p).screenWidth / 454;
  return bitmapTextLayout(
    bitmapFontInfo(f),
    "",
    Math.trunc(l.x * scale),
    Math.trunc(l.y * scale),
    Math.trunc(l.w * scale),
    Math.trunc(l.h * scale),
    l.textAlign,
    l,
  ).baseline;
}
export function bitmapBaselinePatch(
  p: Project,
  l: Layer,
  target: Layer,
): Partial<Layer> {
  const scale = generationDevice(p).screenWidth / 454,
    delta = bitmapLayerBaseline(p, target) - bitmapLayerBaseline(p, l),
    top = Math.trunc(l.y * scale) + delta;
  if (
    top < 0 ||
    top + Math.trunc(l.h * scale) > generationDevice(p).screenHeight
  )
    throw Error("基线对齐将使文字框超出屏幕");
  return { y: (top + 0.01) / scale };
}
