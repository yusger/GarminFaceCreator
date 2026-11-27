import { missingGlyphs } from "./fontLibrary.ts";
import { metricDisplayUnits, metricDecorations } from "./metricFormat.ts";
import { sourceLabels, resolvedLayer } from "./projectControls.ts";
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
    if (!["time", "date", "metric", "text"].includes(l.kind))
      throw Error("粉笔字体仅支持时间、日期、数据和文字");
    if (l.kind === "date" && l.dateLocale === "zh" && l.garminFont === "chalk")
      throw Error("中文日期请使用粉笔中文字体");
    const choices = (id: string, source: string) => [
      ...new Set([
        source,
        ...(p.controls || [])
          .filter(
            (c) =>
              c.type === "dataSource" &&
              c.targets.some(
                (t) => t.layerId === id && t.property === "source",
              ),
          )
          .flatMap((c) => c.options || []),
      ]),
    ];
    let glyphs = "";
    if (l.kind === "time") glyphs = "0123456789:";
    else if (l.kind === "date")
      glyphs =
        l.dateFormat === "monthDayWeek"
          ? "0123456789. SUNMONTUEWEDTHUFRISAT"
          : l.dateLocale === "zh"
            ? "0123456789 周日一二三四五六月"
            : "0123456789 SUNMONTUEWEDTHUFRISAT";
    else if (l.kind === "text") {
      const owner = p.layers.find((x) => x.id === l.sourceLabelFor);
      glyphs = owner
        ? choices(owner.id, owner.source)
            .map((source) => sourceLabels[source] || "--")
            .join("")
        : l.text || " ";
    } else
      glyphs = choices(l.id, l.source)
        .map((source) => {
          const current = resolvedLayer({ ...l, source }, p.layers);
          return (
            "0123456789-. " +
            (current.groupThousands !== false ? "," : "") +
            (current.label || "") +
            (current.unit ?? metricDisplayUnits[source] ?? "") +
            (current.missingValue ?? "--") +
            (current.metricDecoration !== false
              ? metricDecorations[source] || ""
              : "")
          );
        })
        .join("");
    if (
      l.garminFont === "chalk" &&
      /[^\x20-\x7e°]/.test(
        (l.text || "") +
          (l.label || "") +
          (l.unit || "") +
          (l.missingValue || ""),
      )
    )
      throw Error("粉笔数字字体支持 ASCII 与 °；中文请使用粉笔中文字体");
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
export function preparedChalk(p: Project) {
  const plans = chalkPlans(p),
    key = JSON.stringify(plans);
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const reports: FontPreparationReport[] = [];
    const files: CodeFile[] = [],
      assets: { path: string; data: string }[] = [];
    for (const plan of plans) {
      const response = await fetch("/fonts/" + plan.font);
      if (!response.ok) throw Error("粉笔字体加载失败");
      const bytes = await response.arrayBuffer(),
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
    return { files, assets, reports };
  })().catch((e) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, promise);
  return promise;
}
export async function preparedCodeFiles(p: Project) {
  const chalk = await preparedChalk(p),
    files = new Map(p.files.map((f) => [f.path, f]));
  for (const f of chalk.files) files.set(f.path, f);
  return [...files.values()];
}
