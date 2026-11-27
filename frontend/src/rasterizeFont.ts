import type { Project, Layer } from "./domain.ts";
import { generationDevice } from "./devices.ts";
import { fontBytes } from "./localFonts.ts";
import { libraryFonts, missingGlyphs } from "./fontLibrary.ts";
import { requiredFontGlyphs } from "./fontGlyphs.ts";
import { chalkAtlas } from "./chalkAtlas.ts";
import {
  createBitmapFontAsset,
  validateBitmapFonts,
  bitmapFontDiagnostics,
} from "./bitmapFonts.ts";
import { bitmapLayerPatch } from "./bitmapFontLayout.ts";
export function rasterFontAvailable(p: Project, l: Layer) {
  return (
    ["venu445mm", "venu441mm"].includes(generationDevice(p).target) &&
    ["text", "time", "date", "metric"].includes(l.kind) &&
    !l.widgetOrigin &&
    !l.locked
  );
}
// Fixed physical glyphs are prepared in the browser; only explicit compilation sends resources.
export async function rasterizeProjectFont(
  p: Project,
  l: Layer,
  id: string,
  pixels: number,
  extra = "",
) {
  if (!rasterFontAvailable(p, l))
    throw Error(
      "转换仅支持未锁定的独立文字、时间、日期和数据，以及Venu4两种尺寸",
    );
  if (!Number.isSafeInteger(pixels) || pixels < 6 || pixels > 200)
    throw Error("目标像素字号必须是6–200的整数");
  const font =
    p.localFonts?.find((f) => f.id === id) ||
    libraryFonts.find((f) => f.id === id);
  if (!font) throw Error("请选择项目或资源库内有授权的字体");
  const bytes = await fontBytes(p, font.file);
  const required = requiredFontGlyphs(p, {
    ...l,
    garminFont: "auto",
    bitmapTabular: true,
  });
  const glyphs = [...new Set([...(required + extra)])].join("");
  if (
    !glyphs ||
    [...glyphs].length > 512 ||
    [...glyphs].some((c) => c.codePointAt(0)! > 65535 || c.codePointAt(0)! < 32)
  )
    throw Error("字形子集须为1–512个BMP可见字符");
  const missing = missingGlyphs(bytes, glyphs);
  if (missing.length) throw Error("字体缺字：" + missing.join(" "));
  let license = font.license,
    source =
      "source" in font ? font.source : "Licensed library font: " + font.file;
  if (!("data" in font)) {
    const response = await fetch(
      "/fonts/" + font.file.replace(/\.(ttf|otf)$/i, "-LICENSE.txt"),
    );
    if (!response.ok) throw Error("缺少完整字体许可");
    license = await response.text();
  }
  if (!license.trim()) throw Error("缺少完整字体许可");
  const family = "GFCBitmap_" + id + "_" + pixels;
  const atlas = await chalkAtlas(bytes, family, pixels, glyphs, "atlas.png");
  const asset = createBitmapFontAsset(
    atlas.content,
    atlas.data,
    license,
    source,
  );
  const next = {
    ...p,
    bitmapFonts: [
      ...(p.bitmapFonts || []).filter((f) => f.id !== asset.id),
      asset,
    ],
  };
  validateBitmapFonts(next);
  const patch = bitmapLayerPatch(next, asset.id);
  const issues = bitmapFontDiagnostics({
    ...next,
    layers: [{ ...l, ...patch }],
    controls: p.controls,
  });
  if (issues.length) throw Error(issues.map((i) => i.message).join("; "));
  return asset;
}
