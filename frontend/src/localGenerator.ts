import { parseFiles, type Project, type Layer } from "./domain.ts";
import {
  generationRequirements,
  generationManifest,
} from "./generationRequirements.ts";
export const LOCAL_GENERATOR_VERSION = "basic-1";
export const LOCAL_PROVENANCE = {
  primary: "deterministic" as const,
  generatorVersion: LOCAL_GENERATOR_VERSION,
};
const num = (v: number) => Number(v.toFixed(4)).toString();
const color = (v: string) => "0x" + v.replace("#", "");
const xml = (v: string) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
function font(l: Layer, aod: boolean) {
  const size = aod ? l.aodSize || l.size : l.size;
  return (
    "Graphics.FONT_" +
    ({
      tiny: "TINY",
      small: "SMALL",
      medium: "MEDIUM",
      large: "LARGE",
      numberHot: "NUMBER_HOT",
    }[l.garminFont as "tiny"] ||
      (size >= 60
        ? "NUMBER_HOT"
        : size >= 32
          ? "LARGE"
          : size >= 24
            ? "MEDIUM"
            : size >= 18
              ? "SMALL"
              : "TINY"))
  );
}
function primitive(l: Layer, aod: boolean) {
  const fill = color(aod ? l.aodColor || "#777777" : l.color),
    stroke = color(aod ? l.aodColor || "#777777" : l.strokeColor || l.color);
  const paint = `dc.setFill(Graphics.createColor(${Math.round((l.opacity ?? 1) * 255)},(${fill}>>16)&255,(${fill}>>8)&255,${fill}&255));dc.setStroke(Graphics.createColor(${Math.round((l.opacity ?? 1) * 255)},(${stroke}>>16)&255,(${stroke}>>8)&255,${stroke}&255));dc.setPenWidth(px(${num(l.strokeWidth || 2)}));`;
  if (l.kind === "line")
    return l.strokeEnabled === false
      ? ""
      : paint +
          `dc.drawLine(px(${num(l.x)}),px(${num(l.y)}),px(${num(l.x + l.w)}),px(${num(l.y + l.h)}));`;
  let points: number[][] = [];
  if (l.kind === "circle")
    points = Array.from({ length: 48 }, (_, i) => {
      const a = (i * Math.PI * 2) / 48;
      return [
        l.x + l.w / 2 + (Math.cos(a) * l.w) / 2,
        l.y + l.h / 2 + (Math.sin(a) * l.h) / 2,
      ];
    });
  else {
    const r = Math.min(l.cornerRadius ?? 4, l.w / 2, l.h / 2);
    if (!r)
      points = [
        [l.x, l.y],
        [l.x + l.w, l.y],
        [l.x + l.w, l.y + l.h],
        [l.x, l.y + l.h],
      ];
    else
      for (let c = 0; c < 4; c++)
        for (let i = 0; i <= 6; i++) {
          const a = ((-90 + c * 90 + (i * 90) / 6) * Math.PI) / 180;
          const cx = c < 2 ? l.x + l.w - r : l.x + r,
            cy = c === 0 || c === 3 ? l.y + r : l.y + l.h - r;
          points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
  }
  const array =
    "[" +
    points.map(([x, y]) => `[px(${num(x)}),px(${num(y)})]`).join(",") +
    "]";
  return (
    paint +
    `var polygon=${array};` +
    (l.fillEnabled === false ? "" : "dc.fillPolygon(polygon);") +
    (l.strokeEnabled
      ? "for(var i=0;i<polygon.size();i++){var j=(i+1)%polygon.size();dc.drawLine(polygon[i][0],polygon[i][1],polygon[j][0],polygon[j][1]);}"
      : "")
  );
}
function draw(l: Layer, aod: boolean) {
  if (aod && !l.aod) return "";
  if (["rect", "circle", "line"].includes(l.kind))
    return `{${primitive(l, aod)}}`;
  const align = l.textAlign || "center",
    x = l.x + (align === "left" ? 0 : align === "right" ? l.w : l.w / 2);
  const content =
    l.kind === "time"
      ? 'clock.hour.format("%02d")+":"+clock.min.format("%02d")'
      : JSON.stringify(l.text);
  const ink = color(aod ? l.aodColor || "#777777" : l.color);
  return `dc.setFill(Graphics.createColor(255,(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.setStroke(Graphics.createColor(255,(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);dc.drawText(px(${num(x)}),px(${num(l.y + l.h / 2)}),${font(l, aod)},${content},Graphics.TEXT_JUSTIFY_${align.toUpperCase()}|Graphics.TEXT_JUSTIFY_VCENTER);`;
}
export function localGenerate(p: Project) {
  const included = p.layers.filter((l) => l.exportIncluded !== false);
  const unsupported = included.filter(
    (l) =>
      !["time", "text", "rect", "circle", "line"].includes(l.kind) ||
      l.rotation !== 0,
  );
  if (unsupported.length)
    throw Error(
      "本地生成试验仅支持未旋转的时间、文字、矩形、圆形和直线。请移除或排除：" +
        unsupported.map((l) => l.name).join("、"),
    );
  const requirements = generationRequirements(p);
  if (requirements.languages.length > 1)
    throw Error(
      "本地生成试验尚未验证非英文系统字形。请使用 ASCII 项目名和文字，或使用 AI 生成并提供已授权字体。",
    );
  if (
    /[^\x20-\x7e\n\r\t]/.test(
      p.name +
        included
          .filter((l) => l.kind === "text")
          .map((l) => l.text)
          .join(""),
    )
  )
    throw Error(
      "本地生成试验只支持 ASCII 文字；其他文字请先使用 AI 字体方案。",
    );
  const source = `// GarminFaceCreator local generator ${LOCAL_GENERATOR_VERSION}; approximate system font mapping, no SDK fonts bundled.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;
class GeneratedApp extends Application.AppBase {function initialize(){AppBase.initialize();} function getInitialView(){return [new GeneratedView()];}}
class GeneratedView extends WatchUi.WatchFace {
 var sleeping=false;var scale=1.0;
 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 function px(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  scale=dc.getWidth()/454.0;var clock=System.getClockTime();
  dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  if(sleeping){${included.map((l) => draw(l, true)).join("\n")}}else{${included.map((l) => draw(l, false)).join("\n")}}
 }
}`;
  return parseFiles(
    JSON.stringify({
      files: [
        { path: "manifest.xml", content: generationManifest(p) },
        {
          path: "monkey.jungle",
          content:
            "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources\n",
        },
        { path: "source/App.mc", content: source },
        {
          path: "resources/strings/strings.xml",
          content: `<strings><string id="AppName">${xml(p.name)}</string></strings>`,
        },
        {
          path: "resources/drawables/drawables.xml",
          content:
            '<drawables><bitmap id="LauncherIcon" filename="icon.svg"/></drawables>',
        },
        {
          path: "resources/drawables/icon.svg",
          content:
            '<svg xmlns="http://www.w3.org/2000/svg" width="65" height="65"><circle cx="32" cy="32" r="28" fill="#45d6be"/></svg>',
        },
      ],
    }),
  );
}
