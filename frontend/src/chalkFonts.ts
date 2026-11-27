import {preparedBitmapFonts} from "./bitmapFonts.ts";
import {requiredFontGlyphs} from "./fontGlyphs.ts";
import {preparedIconMasks} from "./iconMasks.ts";
import {fontBytes} from "./localFonts.ts";
import {sourceSlotLayer,sourceSlotLabel} from "./dataSlots.ts";
import { missingGlyphs } from "./fontLibrary.ts";
import { metricDisplayUnits, metricDecorations } from "./metricFormat.ts";
import { sourceLabels, resolvedLayer,sourceLabelText } from "./projectControls.ts";
import { expandWidgets } from "./compound.ts";
import type { Layer, Project, CodeFile } from "./domain.ts";
import { generationDevice } from "./devices.ts";
import { chalkAtlas } from "./chalkAtlas.ts";
export const chalkFont = (l: Layer) =>
  !!l.customFont || l.garminFont === "chalk" || l.garminFont === "chalkHan";
export const chalkId = (l: Layer, aod = false) =>
  (l.customFont
    ? "GfcCustom_" + l.customFont.id + "_"
    : "GfcChalk" + (l.garminFont === "chalkHan" ? "Han" : "Latin") + "") +
  Math.round(aod ? l.aodSize || l.size : l.size);
const fontName = (id: string) =>
  id.includes("Han")
    ? "MaShanZheng-Regular.ttf"
    : "PermanentMarker-Regular.ttf";
export function chalkPlans(p: Project) {
  p = expandWidgets(p);
  const plans = new Map<
    string,
    { id: string; size: number; glyphs: string; font: string }
  >();
  const device = generationDevice(p);
  for (const l of p.layers.filter(
    (l) => chalkFont(l) && l.exportIncluded !== false,
  )) {
    if (!["time", "date", "metric", "text", "chart"].includes(l.kind))
      throw Error("粉笔字体仅支持时间、日期、数据和文字");
    if (l.kind === "date" && l.dateLocale === "zh" && l.garminFont === "chalk")
      throw Error("中文日期请使用粉笔中文字体");
    const glyphs=requiredFontGlyphs(p,l);
    for (const aod of l.aod ? [false, true] : [false]) {
      const id = chalkId(l, aod),
        existing = plans.get(id);
      const merged = [
        ...new Set([...(existing?.glyphs || ""), ...glyphs]),
      ].join("");
      plans.set(id, {
        id,
        size: Math.max(
          6,
          Math.round(
            ((aod ? l.aodSize || l.size : l.size) * device.screenWidth) / 454,
          ),
        ),
        glyphs: merged,
        font: l.customFont?.file || fontName(id),
      });
    }
  }
  return [...plans.values()];
}
export type FontPreparationReport = {
  id: string;
  font: string;
  targetPixels: number;
  glyphCount: number;
  fontBytes: number;
  atlasWidth: number;
  atlasHeight: number;
  atlasEncodedBytes: number;
  rgbaBytes: number;
};
const cache = new Map<
  string,
  Promise<{
    files: CodeFile[];
    assets: { path: string; data: string }[];
    reports: FontPreparationReport[];
  }>
>();
const cacheSizes = new Map<string, number>();
function trimFontCache() {
  while (
    cache.size > 16 ||
    [...cacheSizes.values()].reduce((a, b) => a + b, 0) > 16 * 1024 * 1024
  ) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
    cacheSizes.delete(oldest);
  }
}
export function preparedChalk(p: Project) {
  const plans = chalkPlans(p),
    key = JSON.stringify([plans,(p.localFonts||[]).filter(f=>plans.some(plan=>plan.font===f.file))]);
  const existing = cache.get(key);
  if (existing) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const promise = (async () => {
    const reports: FontPreparationReport[] = [];
    const files: CodeFile[] = [],
      assets: { path: string; data: string }[] = [];
    for (const plan of plans) {
      const bytes = await fontBytes(p,plan.font),
        missing = missingGlyphs(bytes, plan.glyphs);
      if (missing.length)
        throw Error(
          "字体 " +
            plan.font +
            " 缺少所需字符：" +
            missing.join(" ") +
            "；未使用系统回退字形生成资源。",
        );
      const atlas = await chalkAtlas(
        bytes,
        plan.id,
        plan.size,
        plan.glyphs,
        plan.id + ".png",
      );
      const common =
        /common lineHeight=\d+ base=\d+ scaleW=(\d+) scaleH=(\d+)/.exec(
          atlas.content,
        );
      if (!common) throw Error("字体图集元数据缺失");
      const atlasWidth = Number(common[1]),
        atlasHeight = Number(common[2]),
        payload = atlas.data.split(",")[1];
      reports.push({
        id: plan.id,
        font: plan.font,
        targetPixels: plan.size,
        glyphCount: new Set([...plan.glyphs]).size,
        fontBytes: bytes.byteLength,
        atlasWidth,
        atlasHeight,
        atlasEncodedBytes:
          Math.floor((payload.length * 3) / 4) -
          (payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0),
        rgbaBytes: atlasWidth * atlasHeight * 4,
      });
      files.push({
        path: "resources/fonts/" + plan.id + ".fnt",
        content: atlas.content,
      });
      assets.push({
        path: "resources/fonts/" + plan.id + ".png",
        data: atlas.data,
      });
    }
    const value = { files, assets, reports };
    if (cache.has(key)) {
      cacheSizes.set(
        key,
        new TextEncoder().encode(JSON.stringify(value)).byteLength,
      );
      trimFontCache();
    }
    return value;
  })().catch((e) => {
    cache.delete(key);
    cacheSizes.delete(key);
    throw e;
  });
  cache.set(key, promise);
  trimFontCache();
  return promise;
}
export async function preparedCodeFiles(p: Project) {
  const chalk = await preparedChalk(p),
    files = new Map(p.files.map((f) => [f.path, f]));
  for (const f of [...chalk.files,...(await preparedBitmapFonts(p)).files,...(await preparedIconMasks(p)).files]) files.set(f.path, f);
  return [...files.values()];
}
