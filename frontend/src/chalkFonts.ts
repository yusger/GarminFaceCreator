import type { Layer, Project, CodeFile } from "./domain.ts";
import { generationDevice } from "./devices.ts";
import { chalkAtlas } from "./chalkAtlas.ts";
export const chalkFont = (l: Layer) =>
  !!l.customFont || l.garminFont === "chalk" || l.garminFont === "chalkHan";
export const chalkId = (l: Layer, aod = false) =>
  (l.customFont
    ? "GfcCustom_" + l.customFont.id + "_"
    : "GfcChalk" + (l.garminFont === "chalkHan" ? "Han" : "Latin") + "") +
  Math.round(aod ? l.aodSize || l.size : l.size) +
  ((l.opacity ?? 1) < 1 ? "_a" + Math.round((l.opacity ?? 1) * 255) : "");
const fontName = (id: string) =>
  id.includes("Han")
    ? "MaShanZheng-Regular.ttf"
    : "PermanentMarker-Regular.ttf";
export function chalkPlans(p: Project) {
  const plans = new Map<
    string,
    { id: string; size: number; glyphs: string; font: string; opacity: number }
  >();
  const device = generationDevice(p);
  for (const l of p.layers.filter(
    (l) => chalkFont(l) && l.exportIncluded !== false,
  )) {
    if (!["time", "date", "metric", "text"].includes(l.kind))
      throw Error("粉笔字体仅支持时间、日期、数据和文字");
    if (l.kind === "date" && l.dateLocale === "zh" && l.garminFont === "chalk")
      throw Error("中文日期请使用粉笔中文字体");
    const ascii =
      Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join(
        "",
      ) + "°";
    const glyphs =
      l.kind === "time"
        ? "0123456789:"
        : l.kind === "text" && !l.sourceLabelFor
          ? l.text || " "
          : ascii +
            (l.garminFont === "chalkHan"
              ? (l.label || "") +
                (l.unit || "") +
                (l.missingValue || "") +
                (l.kind === "date" && l.dateLocale === "zh"
                  ? "周日一二三四五六月"
                  : "")
              : "");
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
    for (const aod of [false, true]) {
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
        opacity: l.opacity ?? 1,
      });
    }
  }
  return [...plans.values()];
}
const cache = new Map<
  string,
  Promise<{ files: CodeFile[]; assets: { path: string; data: string }[] }>
>();
export function preparedChalk(p: Project) {
  const plans = chalkPlans(p),
    key = JSON.stringify(plans);
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const files: CodeFile[] = [],
      assets: { path: string; data: string }[] = [];
    for (const plan of plans) {
      const response = await fetch("/fonts/" + plan.font);
      if (!response.ok) throw Error("粉笔字体加载失败");
      const atlas = await chalkAtlas(
        await response.arrayBuffer(),
        plan.id,
        plan.size,
        plan.glyphs,
        plan.id + ".png",
        plan.opacity,
      );
      files.push({
        path: "resources/fonts/" + plan.id + ".fnt",
        content: atlas.content,
      });
      assets.push({
        path: "resources/fonts/" + plan.id + ".png",
        data: atlas.data,
      });
    }
    return { files, assets };
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
