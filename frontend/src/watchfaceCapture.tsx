import { renderToStaticMarkup } from "react-dom/server";
import Scene, { reading, type Preview } from "./Scene";
import { expandWidgets } from "./compound";
import { resolveControls } from "./projectControls";
import { generationDevice } from "./devices";
import { rasterIcon } from "./iconLibrary";
import { weatherGroup, weatherIconId } from "./weatherIcons";
import {fontBytes} from "./localFonts";
import { missingGlyphs } from "./fontLibrary";
import { localDateKey, calendarDateLabel } from "./calendar";
import type { Project } from "./domain";
export type WatchfaceCapture = {
  rendererVersion:"browser-capture-2";
  device:ReturnType<typeof generationDevice>;
  browser:string;
  data: string;
  width: number;
  height: number;
  mode: "active" | "aod";
  preview: Preview;
  projectId: string;
  revision: number;
  warnings: string[];
};
const fileData = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("读取截图资源失败"));
    reader.readAsDataURL(blob);
  });
export async function captureWatchface(
  project: Project,
  preview: Preview,
  aod = false,
): Promise<WatchfaceCapture> {
  const p = resolveControls(expandWidgets(structuredClone(project))),
    device = generationDevice(p),
    d = structuredClone(preview);
  d.calendarDate ||= localDateKey(new Date());
  d.date ||= calendarDateLabel(d.calendarDate);
  d.utcOffsetMinutes ??= -new Date(
    d.calendarDate + "T" + d.time + ":00",
  ).getTimezoneOffset();
  if (aod) d.seconds = 0;
  const warnings = new Set<string>(),
    fonts = new Map<string, string>();
  for (const l of p.layers) {
    if (
      l.exportIncluded === false ||
      (!aod && l.activeVisible === false) ||
      (aod && !l.aod)
    )
      continue;
    if(l.kind==="chart")warnings.add("图表历史为网页示意样例；不代表设备历史覆盖率，AOD原生使用最近亮屏缓存。");
    if (l.libraryIcon) {
      if (l.weatherIcon)
        l.libraryIcon = {
          ...l.libraryIcon,
          id: weatherIconId(
            l,
            weatherGroup(d.missing ? null : (d.weatherCondition ?? 0)).key,
          ),
        };
      l.image = await rasterIcon(l, p);
    }
    if (l.kind === "image" || l.handBitmap) {
      if (!l.image || !/^data:image\/(png|jpeg|webp);base64,/.test(l.image))
        throw Error("截图图片缺失或不是本地位图：" + l.name);
      const img = new Image();
      img.src = l.image;
      await img.decode();
    }
    const f = l.customFont
      ? { family: "GfcFace_" + l.customFont.id, file: l.customFont.file }
      : l.garminFont === "chalk"
        ? { family: "GfcChalkLatin", file: "PermanentMarker-Regular.ttf" }
        : l.garminFont === "chalkHan"
          ? { family: "GfcChalkHan", file: "MaShanZheng-Regular.ttf" }
          : null;
    if (f) {
      if (!/^[A-Za-z0-9_-]+\.(ttf|otf)$/.test(f.file))
        throw Error("截图字体路径无效");
      const bytes = await fontBytes(p,f.file);
      const missing = missingGlyphs(bytes, reading(l, d));
      if (missing.length) throw Error("截图字体缺字：" + missing.join(" "));
      const face = await new FontFace(f.family, bytes).load();
      document.fonts.add(face);
      fonts.set(
        f.family,
        await fileData(new Blob([bytes], { type: "font/ttf" })),
      );
    } else if (
      ["time", "date", "text", "metric", "calendar", "wordTime", "arcText"].includes(
        l.kind,
      )
    )
      warnings.add("系统字体使用网页替代字形；不代表设备字体或真机效果。");
  }
  let text = renderToStaticMarkup(
    <Scene project={p} preview={d} aod={aod} exact />,
  );
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw Error("截图SVG生成失败");
  const svg = doc.documentElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(device.screenWidth));
  svg.setAttribute("height", String(device.screenHeight));
  const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = [...fonts]
    .map(
      ([family, url]) =>
        '@font-face{font-family:"' +
        family +
        '";src:url("' +
        url +
        '") format("truetype");}',
    )
    .join("\n");
  svg.insertBefore(style, svg.firstChild);
  text = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = device.screenWidth;
    canvas.height = device.screenHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("截图画布不可用");
    ctx.drawImage(img, 0, 0);
    return {
      rendererVersion:"browser-capture-2",
      device,
      browser:navigator.userAgent,
      data: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
      mode: aod ? "aod" : "active",
      preview: d,
      projectId: project.id,
      revision: project.revision,
      warnings: [...warnings],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
