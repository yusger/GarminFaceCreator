import { validateProject, type Project, type Layer } from "./domain";
import { bitmapLayerPatch } from "./bitmapFontLayout";
import {
  bitmapFontInfo,
  bitmapGlyphMissing,
  bitmapFontDiagnostics,
} from "./bitmapFonts";
import { requiredFontGlyphs } from "./fontGlyphs";
export function batchBitmapTypography(
  p: Project,
  ids: string[],
  sourceId: string,
): Layer[] {
  const source = p.layers.find((l) => l.id === sourceId),
    font = p.bitmapFonts?.find((f) => f.id === source?.bitmapFontId);
  if (
    !source ||
    !font ||
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !p.layers.some((l) => l.id === id))
  )
    throw Error("请选择有效的位图文字对象");
  const chosen = new Set(ids),
    options = {
      bitmapTracking: source.bitmapTracking,
      bitmapTabular: source.bitmapTabular,
      bitmapBaselineShift: source.bitmapBaselineShift,
      bitmapLineHeight: source.bitmapLineHeight,
    };
  for (const l of p.layers.filter((l) => chosen.has(l.id))) {
    if (l.locked) throw Error("选中对象含锁定图层，未应用排版");
    if (!["text", "time", "date", "metric"].includes(l.kind) || l.widgetOrigin)
      throw Error("批量排版仅适用于独立文字对象");
  }
  const layers = p.layers.map((l) => {
    if (!chosen.has(l.id)) return l;
    const next = { ...l, ...bitmapLayerPatch(p, font.id), ...options };
    const missing = bitmapGlyphMissing(
      bitmapFontInfo(font),
      requiredFontGlyphs(p, next),
    );
    if (missing.length) throw Error("批量排版缺字：" + missing.join(" "));
    return next;
  });
  validateProject({ ...p, layers });
  const issue = bitmapFontDiagnostics({ ...p, layers }).find((d) =>
    chosen.has(d.layerId),
  );
  if (issue) throw Error(issue.message);
  return layers;
}
