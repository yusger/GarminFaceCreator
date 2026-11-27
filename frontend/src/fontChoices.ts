import { requiredFontGlyphs } from "./fontGlyphs.ts";
import { libraryFonts, fontPatch } from "./fontLibrary.ts";
import { bitmapFontInfo, bitmapGlyphMissing } from "./bitmapFonts.ts";
import { bitmapLayerPatch } from "./bitmapFontLayout.ts";
import type { Project, Layer } from "./domain.ts";
export const systemFontIds = [
  "auto",
  "xtiny",
  "systemXTiny",
  "tiny",
  "small",
  "medium",
  "large",
  "numberHot",
] as const;
export function approvedFontChoices(p: Project) {
  return [
    ...systemFontIds.map((id) => ({
      id: "system:" + id,
      name: id,
      kind: "system",
      fixedPixelSize: null,
    })),
    ...libraryFonts.map((f) => ({
      id: f.id,
      name: f.family,
      kind: "library",
      fixedPixelSize: null,
    })),
    ...(p.localFonts || []).map((f) => ({
      id: f.id,
      name: f.family,
      kind: "local",
      fixedPixelSize: null,
    })),
    ...(p.bitmapFonts || []).map((f) => {
      const info = bitmapFontInfo(f);
      return {
        id: f.id,
        name: f.family,
        kind: "bitmap",
        fixedPixelSize: info.size,
        glyphs: Object.keys(info.glyphs)
          .map(Number)
          .map((n) => String.fromCodePoint(n))
          .join(""),
        policy:
          "Fixed target pixels, shared advances/kerning; choosing sets active/AOD size to match. No scaling or system fallback.",
      };
    }),
  ];
}
export function fontChoicePatch(
  p: Project,
  l: Layer,
  id: string,
): Partial<Layer> {
  if (!["text", "time", "date", "metric", "chart"].includes(l.kind))
    throw Error("该控件不能更换字体");
  if (!approvedFontChoices(p).some((f) => f.id === id))
    throw Error("只能选择项目已批准的字体");
  if (id.startsWith("system:"))
    return {
      bitmapFontId: undefined,
      customFont: undefined,
      garminFont: id.slice(7) as Layer["garminFont"],
    };
  if (p.bitmapFonts?.some((f) => f.id === id)) {
    if (l.kind === "chart") throw Error("位图字体首版不支持图表");
    const patch = bitmapLayerPatch(p, id),
      asset = p.bitmapFonts!.find((f) => f.id === id)!;
    if (
      bitmapGlyphMissing(
        bitmapFontInfo(asset),
        requiredFontGlyphs(p, { ...l, ...patch }),
      ).length
    )
      throw Error("所选位图字体缺少该控件所需字形");
    return patch;
  }
  const local = p.localFonts?.find((f) => f.id === id);
  if (local)
    return {
      bitmapFontId: undefined,
      customFont: { id: local.id, file: local.file, family: local.family },
      garminFont: "auto",
      fontWeight: 400,
    };
  return { ...fontPatch(id), fontWeight: 400 };
}
