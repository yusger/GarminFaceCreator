import type { Project, Layer } from "./domain";
import { validateProject } from "./domain";
import { layoutTemplate } from "./layoutTemplates";
import { generationDevice } from "./devices";
import { rasterizeProjectFont } from "./rasterizeFont";
import { requiredFontGlyphs } from "./fontGlyphs";
import { bitmapLayerPatch } from "./bitmapFontLayout";
import { bitmapFontDiagnostics } from "./bitmapFonts";
// Used only for explicitly selected visual kits. Build all resources atomically in browser memory.
export async function prepareVisualKit(
  p: Project,
  id?: string,
): Promise<Project> {
  const kit = layoutTemplate(id)?.visualKit;
  if (!kit) return p;
  const device = generationDevice(p);
  if (!kit.targets.includes(device.target))
    throw Error("视觉套件仅支持Venu 4两尺寸");
  const groups = new Map<
      string,
      { font: string; pixels: number; layers: Layer[] }
    >(),
    scale = device.screenWidth / 454;
  for (const l of p.layers.filter((l) => l.customFont)) {
    if (
      !["text", "time", "date", "metric"].includes(l.kind) ||
      l.locked ||
      l.widgetOrigin
    )
      throw Error("视觉套件的精确字体仅支持未锁定的独立文字、时间、日期和数据");
    const pixels = Math.round(l.size * scale);
    if (l.aod && Math.round((l.aodSize || l.size) * scale) !== pixels)
      throw Error("视觉套件请将不同字号的息屏文字拆为独立息屏图层");
    const key = l.customFont!.id + ":" + pixels,
      g = groups.get(key) || { font: l.customFont!.id, pixels, layers: [] };
    g.layers.push(l);
    groups.set(key, g);
  }
  if (
    groups.size +
      new Set(p.layers.filter((l) => l.bitmapFontId).map((l) => l.bitmapFontId))
        .size >
    8
  )
    throw Error("视觉套件每个目标最多8组固定像素字体，请合并相同字体和字号");
  let next = structuredClone(p);
  const fontRoles=[...(p.fontRoles||[])];
  for (const g of groups.values()) {
    const subset = [
      ...new Set(g.layers.flatMap((l) => [...requiredFontGlyphs(p, l)])),
    ].join("");
    const font = await rasterizeProjectFont(
      next,
      g.layers[0],
      g.font,
      g.pixels,
      subset,
    );
    next = {
      ...next,
      bitmapFonts: [
        ...(next.bitmapFonts || []).filter((f) => f.id !== font.id),
        font,
      ],
    };
    const ids = new Set(g.layers.map((l) => l.id));
    if(g.layers.some(l=>p.fontRoles?.some(r=>r.layerIds.includes(l.id))))throw Error("套件字体准备前请先解除已有字体角色，避免重复关联");
    fontRoles.push({id:("kit-font-"+g.font+"-"+g.pixels).replaceAll("_","-"),name:g.font+" · "+g.pixels+"px",fontId:font.id,layerIds:[...ids]});
    next.layers = next.layers.map((l) =>
      ids.has(l.id) ? { ...l, ...bitmapLayerPatch(next, font.id) } : l,
    );
  }
  next={...next,fontRoles};
  const diagnostics = bitmapFontDiagnostics(next);
  if (diagnostics.length)
    throw Error(diagnostics.map((d) => d.message).join("；"));
  validateProject(next);
  return next;
}
