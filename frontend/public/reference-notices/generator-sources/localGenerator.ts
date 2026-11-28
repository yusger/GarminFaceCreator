import {useLibraryIconMask} from "./libraryIconMasks.ts";
import {nativeMoonFiles} from "./nativeMoon.ts";
import {bitmapFontDiagnostics,bitmapFontResourceId,usedBitmapFonts} from "./bitmapFonts.ts";
import {nativeBitmapFontFiles} from "./nativeBitmapFonts.ts";
import {triangulatePolygon} from "./geometry.ts";
import {meterDefaultGoal} from "./meters.ts";
import {nativeHourlyChartHelpers} from "./nativeHourlyCharts.ts";
import {chartConfig} from "./charts.ts";
import {extraNativeMetrics} from "./nativeExtraMetrics.ts";
import {themeBackground} from "./themes.ts";
import {nativeChartDraw,nativeChartHelpers} from "./nativeCharts.ts";
import {validateChart} from "./charts.ts";
import {iconMaskId} from "./iconMasks.ts";
import {primitivePoints} from "./primitiveSampling.ts";
import {mappedDraw} from "./sourceMap.ts";
import { deviceMetadataVersion } from "./deviceMetadata.ts";
import {nativeMetricValidation} from "./metricFormat.ts";
import { localConfigurationDiagnostics } from "./generationDiagnostics.ts";
import {nativeCurvedText} from "./curvedTextLayout.ts";
import {nativeArcMethod} from "./arc.ts";
﻿import { rotatePoint } from "./geometry.ts";
import { capabilityCatalog, localLayerDiagnostics } from "./capabilities.ts";
import { expandWidgets } from "./compound.ts";
import { resolveControls, validateControls } from "./projectControls.ts";
import { nativeControls, nativeControlledDraw } from "./nativeControls.ts";
import { chalkFont, chalkId, chalkPlans } from "./chalkFonts.ts";
import { nativeVisibility, validateVisibility } from "./visibility.ts";
import { imageAssetPath } from "./assets.ts";
import { generationDevice } from "./devices.ts";
import { nativeTimeText, nativeClock } from "./timeParts.ts";
import { mergeNativeWordTime } from "./wordTime.ts";
import { defaultThresholds } from "./thresholds.ts";
import { metricDisplayUnits } from "./metricFormat.ts";
import { meterPolygons } from "./meters.ts";
import { iconDrawMethod, mergeNativeIcons } from "./weatherIcons.ts";
import { parseFiles, type Project, type Layer } from "./domain.ts";
import {
  generationRequirements,
  generationManifest,
} from "./generationRequirements.ts";
export const LOCAL_GENERATOR_VERSION = "basic-69-sleep-frame-ready";
export const LOCAL_PROVENANCE = {
  primary: "deterministic" as const,
  generatorVersion: LOCAL_GENERATOR_VERSION,
  deviceMetadataVersion,
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
  if(l.bitmapFontId)return `fontFor(Rez.Fonts.${bitmapFontResourceId(l.bitmapFontId)})`;
  if (chalkFont(l)) return `fontFor(Rez.Fonts.${chalkId(l, aod)})`;
  if (l.kind === "date" && l.dateLocale === "zh")
    return "Graphics.FONT_SYSTEM_XTINY";
  const size = aod ? l.aodSize || l.size : l.size;
  return (
    "Graphics.FONT_" +
    ({
      xtiny: "XTINY",
      systemXTiny: "SYSTEM_XTINY",
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
function primitive(l: Layer, aod: boolean, targetScale:number) {
  const fill = color(aod ? l.aodColor || "#777777" : l.color),
    stroke = color(aod ? l.aodColor || "#777777" : l.strokeColor || l.color);
  const alpha = Math.round((l.opacity ?? 1) * 255);
  const fillPaint = `dc.setColor(${fill},Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(${alpha},(${fill}>>16)&255,(${fill}>>8)&255,${fill}&255));`;
  const strokePaint = `dc.setColor(${stroke},Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(${alpha},(${stroke}>>16)&255,(${stroke}>>8)&255,${stroke}&255));dc.setPenWidth(px(${num(l.strokeWidth || 2)})>0?px(${num(l.strokeWidth || 2)}):1);`;
  const fillTool =
    fillPaint +
    (alpha === 255 ? `dc.setColor(${fill},Graphics.COLOR_TRANSPARENT);` : "");
  const strokeTool =
    strokePaint +
    (alpha === 255 ? `dc.setColor(${stroke},Graphics.COLOR_TRANSPARENT);` : "");
  const rotate = (x: number, y: number) =>
    rotatePoint(x, y, l.x + l.w / 2, l.y + l.h / 2, l.rotation);
  if (l.kind === "line") {
    const [x1, y1] = rotate(l.x, l.y),
      [x2, y2] = rotate(l.x + l.w, l.y + l.h);
    return l.strokeEnabled === false
      ? ""
      : strokeTool +
          `dc.drawLine(px(${num(x1)}),px(${num(y1)}),px(${num(x2)}),px(${num(y2)}));`;
  }
  if(l.kind==="polygon")triangulatePolygon(l.polygonPoints!);
  const points = primitivePoints(l,targetScale);
  const array =
    "[" +
    points
      .map(([x, y]) => rotate(x, y))
      .map(([x, y]) => `[px(${num(x)}),px(${num(y)})]`)
      .join(",") +
    "]";
  return (
    `var polygon=${array};` +
    (l.fillEnabled === false ? "" : fillTool + "dc.setStroke(Graphics.createColor(0,0,0,0));dc.fillPolygon(polygon);") +
    (l.strokeEnabled
      ? strokeTool +
        "for(var i=0;i<polygon.size();i++){var j=(i+1)%polygon.size();dc.drawLine(polygon[i][0],polygon[i][1],polygon[j][0],polygon[j][1]);}"
      : "")
  );
}
function draw(l: Layer, aod: boolean, targetScale:number,paintOverride?:string,maskIcon=false):string {
  if (!aod && l.activeVisible === false) return "";
  if (
    aod &&
    (!l.aod ||
      (l.kind === "metric" &&
        l.source === "seconds" &&
        l.aodSeconds === "hide"))
  )
    return "";
  if(l.kind === "chart")return nativeChartDraw(l,aod,font(l,aod));
  if(l.kind === "arcText")return `drawCurvedLabel(dc,${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${num(l.arcRadius??0.4)},${num(l.arcStartAngle??0)},${l.arcDirection==="counterclockwise"?"false":"true"},${num(l.arcSpacing??0)},${num(aod?l.aodSize||l.size:l.size)},${color(aod?l.aodColor||"#777777":l.color)},${JSON.stringify(l.text)},${l.textAlign==="left"?0:l.textAlign==="right"?2:1});`;
  if (l.kind === "ring") {
    const source = l.ringSource || "seconds",
      goal =
        source === "static"
          ? 1
          : l.ringGoal ||
            (source === "steps"
              ? 10000
              : source === "battery"
                ? 100
                : source === "seconds"
                  ? 60
                  : 180);
    const value =
      source === "static"
        ? "1"
        : source === "seconds"
          ? aod
            ? "0"
            : "clock.sec"
          : "data" + source;
    if(l.ringStyle==="continuous") return `drawProgressArc(dc,${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${num(l.ringStart??0)},${num(l.ringEnd??360)},${num(l.ringWidth||2)},${color(aod?l.aodColor||"#777777":l.color)},${num(l.ringDim??0.25)},${value},${num(goal)},${source==="battery"?"true":"false"},${source==="heartRate"?"true":"false"},${aod?"true":"false"},${l.ringCap==="round"?"true":"false"});`;
    return `drawTickRing(dc,${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${l.ringTicks || 60},${num(l.ringStart ?? 0)},${num(l.ringEnd ?? 360)},${color(aod ? l.aodColor || "#777777" : l.color)},${num(l.ringDim ?? 0.25)},${value},${num(goal)},${source === "battery" ? "true" : "false"},${source === "heartRate" ? "true" : "false"},${aod ? "true" : "false"},${num(l.ringWidth || 2)});`;
  }
  if (l.kind === "hand") {
    if (aod && l.handType === "second" && l.aodSeconds === "hide") return "";
    if (l.handBitmap)
      return `drawBitmapHand(dc,clock,Rez.Drawables.${bitmapId(l)},${l.handType === "second" ? 2 : l.handType === "minute" ? 1 : 0},${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${num(l.handPivotX ?? 0.5)},${num(l.handPivotY ?? 0.5)},${aod ? "true" : "false"},${color(l.aodColor || "#777777")});`;
    return `drawHand(dc,clock,${l.handType === "second" ? 2 : l.handType === "minute" ? 1 : 0},${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${num(l.handPivotX ?? 0.5)},${num(l.handPivotY ?? 0.5)},${num(l.handReach ?? 0.58)},${num(l.handTail ?? 0.08)},${num(l.strokeWidth || 6)},${color(aod ? l.aodColor || "#777777" : l.color)},${aod ? "true" : "false"},${l.handCap === "round" ? "true" : "false"},${l.handShape ? JSON.stringify(l.handShape.points) : "null"});`;
  }
  if(l.kind==="moon")return `GfcMoon.draw(dc,px(${num(l.x)}),px(${num(l.y)}),px(${num(l.w)}),px(${num(l.h)}),${color(aod?l.aodColor||"#777777":l.color)},${color(l.solarNightColor||"#263344")},${l.moonHemisphere==="south"},${aod});`;
  if (l.kind === "celestial")
    return `drawCelestial(dc,solar,${l.solarPart === "body" ? 1 : 0},${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${color(aod ? l.aodColor || "#777777" : l.color)},${color(aod ? l.aodColor || "#777777" : l.solarNightColor || (l.solarPart === "body" ? "#dfedff" : "#0b1829"))},${color(aod ? l.aodColor || "#777777" : l.solarMissingColor || "#17212c")});`;
  if (l.kind === "wordTime") {
    const ink = color(aod ? l.aodColor || "#777777" : l.color),
      align = l.textAlign || "center",
      x = l.x + (align === "left" ? 0 : align === "right" ? l.w : l.w / 2);
    const rowIndex = { top: 0, middle: 1, bottom: 2 }[l.wordRow as "top"],
      rowCount = rowIndex === undefined ? 3 : 1;
    return `{var rows=GfcWordTime.lines(clock.hour,clock.min,${aod ? 0 : "clock.sec"},${JSON.stringify(l.wordLanguage || "en")});dc.setFill(Graphics.createColor(255,(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.setStroke(Graphics.createColor(255,(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);for(var line=0;line<${rowCount};line++){dc.drawText(px(${num(x)}),px(${num(l.y)}+(line+0.5)*${num(l.h)}/${rowCount}),${font(l, aod)},rows[${rowIndex === undefined ? "line" : rowIndex}],Graphics.TEXT_JUSTIFY_${align.toUpperCase()}|Graphics.TEXT_JUSTIFY_VCENTER);}}`;
  }
  if (l.kind === "calendar") {
    const normal = color(aod ? l.aodColor || "#777777" : l.color),
      muted = color(
        aod ? l.aodColor || "#777777" : l.calendarMutedColor || "#586a7f",
      ),
      header = color(
        aod ? l.aodColor || "#777777" : l.calendarHeaderColor || "#7891aa",
      ),
      highlight = color(
        aod ? l.aodColor || "#777777" : l.calendarTodayColor || "#70c7ff",
      ),
      todayText = color(l.calendarTodayText || "#07131d");
    return `drawCalendar(dc,calendar,${l.calendarStart === "sunday" ? 0 : 1},${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${font(l, aod)},${normal},${muted},${header},${highlight},${todayText});`;
  }
  if(l.kind==="meter"&&l.threshold&&!aod){
    const rules=l.thresholdRules??defaultThresholds(l.source,l.color);
    return `{var value=data${l.source};var meterInk=${color(l.thresholdFallback||l.color)};if(metricValid(value,${JSON.stringify(l.source)})){${rules.map((r,i)=>`${i?"else ":""}if(${[r.min!==undefined?`value>=${num(r.min)}`:"true",r.max!==undefined?`value<${num(r.max)}`:"true"].join(" && ")}){meterInk=${color(r.color)};}`).join("")}}${draw({...l,threshold:false},aod,targetScale,"meterInk")}}`;
  }
  if (l.kind === "meter" && l.meterContinuous) {
    const raw = "data" + l.source,
      base = color(
        aod ? l.aodColor || "#777777" : l.meterDimColor || "#16324a",
      ),
      ink = paintOverride||color(aod ? l.aodColor || "#777777" : l.color);
    return `{dc.setColor(${base},Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(${num(l.x)}),px(${num(l.y)}),px(${num(l.w)}),px(${num(l.h)}));var ratio=0.0;if(metricValid(${raw},${JSON.stringify(l.source)})){ratio=${raw}*1.0/${num(l.meterGoal ?? meterDefaultGoal(l.source))};if(ratio>1){ratio=1;}}dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(${num(l.x)}),px(${num(l.y)}),px(${num(l.w)}*ratio),px(${num(l.h)}));}`;
  }
  if (l.kind === "meter") {
    const ink = paintOverride||color(aod ? l.aodColor || "#777777" : l.color),
      goal = l.meterGoal ?? meterDefaultGoal(l.source),
      count = l.meterCount ?? 16;
    return (
      `{dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);var lit=meterCount(${"data"+l.source},${num(goal)},${count},${JSON.stringify(l.source)});` +
      meterPolygons(l)
        .map(
          (points, i) =>
            `dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(${i}<lit?255:${Math.round((l.meterDim ?? 0.35) * 255)},(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));if(${i}<lit || ${Math.round((l.meterDim ?? 0.35) * 255)}==255){dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);}dc.fillPolygon([${points.map(([x, y]) => `[px(${num(l.x + x)}),px(${num(l.y + y)})]`).join(",")}]);`,
        )
        .join("") +
      `}`
    );
  }
  if(l.kind==="image"&&l.iconMask)return `textPaint(dc,${color(aod?l.aodColor||l.color:l.color)},255);dc.setColor(${color(aod?l.aodColor||l.color:l.color)},Graphics.COLOR_TRANSPARENT);dc.drawText(px(${num(l.x)}),px(${num(l.y)}),fontFor(Rez.Fonts.${iconMaskId(l)}),"A",Graphics.TEXT_JUSTIFY_LEFT);`;
  if (l.kind === "image" && !l.libraryIcon)
    return `drawStaticImage(dc,Rez.Drawables.${bitmapId(l)},px(${num(l.x)}),px(${num(l.y)}));`;
  if (l.kind === "image" && l.libraryIcon)
    return maskIcon?`GfcIcons.${iconDrawMethod(l)}Tint(dc,px(${num(l.x)}),px(${num(l.y)}),${color(aod?l.aodColor||l.color:l.color)});`:`GfcIcons.${iconDrawMethod(l)}(dc,px(${num(l.x)}),px(${num(l.y)}));`;
  if (["rect", "circle", "line", "polygon"].includes(l.kind))
    return `{${primitive(l, aod, targetScale)}}`;
  const align = l.textAlign || "center",
    x = l.x + (align === "left" ? 0 : align === "right" ? l.w : l.w / 2);
  const content =
    l.kind === "time"
      ? nativeTimeText(l.timePart, nativeClock(l.timeUtcOffset))
      : l.kind === "date"
        ? l.dateFormat === "monthDayWeek"
          ? "dateMonthDayWeek"
          : l.dateFormat === "weekdayDay" ? 'dateText.substring(0,4)+calendar.day.format("%02d")' : l.dateLocale === "zh"
            ? "dateZh"
            : "dateText"
        : l.kind === "metric"
          ? `metricText(value,${JSON.stringify(l.source)},${JSON.stringify(l.label ? l.label + " " : "")},${JSON.stringify(l.unit ?? metricDisplayUnits[l.source] ?? "")},${l.precision ?? -1},${JSON.stringify(l.missingValue ?? "--")},${(l.groupThousands ?? (l.source === "steps" && l.precision === undefined)) ? "true" : "false"})`
          : JSON.stringify(l.text);
  let paint = color(aod ? l.aodColor || "#777777" : l.color),
    prefix = "",
    suffix = "";
  if (l.kind === "metric") {
    const raw =
      l.source === "seconds" ? (aod ? "0" : "clock.sec") : "data" + l.source;
    prefix = `{var value=${raw};`;
    if (l.threshold && !aod) {
      const rules = l.thresholdRules ?? defaultThresholds(l.source, l.color);
      prefix +=
        `var ink=${color(l.thresholdFallback || l.color)};if(metricValid(value,${JSON.stringify(l.source)})){` +
        rules
          .map(
            (r, i) =>
              `${i ? "else " : ""}if(${[r.min !== undefined ? `value>=${num(r.min)}` : "true", r.max !== undefined ? `value<${num(r.max)}` : "true"].join(" && ")}){ink=${color(r.color)};}`,
          )
          .join("") +
        `}`;
      paint = "ink";
    }
    suffix = "}";
  }
  const nativeFont = l.widgetOrigin
    ? `widgetFont(dc,${content},${font(l, aod)},px(${num(l.w)}),px(${num(l.h)}),px(${num(aod ? l.aodSize || l.size : l.size)}))`
    : font(l, aod);
  const ink =
    (l.opacity ?? 1) < 1
      ? `mixTextInk(${paint},${Math.round((l.opacity ?? 1) * 255)},bg)`
      : paint;
  return (
    prefix +
    (l.bitmapFontId?`textPaint(dc,${ink},${Math.round((l.opacity??1)*255)});GfcBitmapText.drawDetailed(dc,px(${num(l.x)}),px(${num(l.y)}),px(${num(l.w)}),px(${num(l.h)}),${nativeFont},${JSON.stringify(l.bitmapFontId)},${content},${JSON.stringify(align)},${l.bitmapTracking||0},${!!l.bitmapTabular},${l.bitmapBaselineShift||0},${l.bitmapLineHeight||0});`:`textPaint(dc,${ink},${Math.round((l.opacity ?? 1) * 255)});dc.drawText(px(${num(x)}),px(${num(l.y + l.h / 2)}),${nativeFont},${content},Graphics.TEXT_JUSTIFY_${align.toUpperCase()}|Graphics.TEXT_JUSTIFY_VCENTER);`) +
    suffix
  );
}
function bitmapId(l: Layer) {
  return "GfcImage_" + l.id.replace(/[^a-zA-Z0-9]/g, "_");
}
function visibleDraw(l: Layer, aod: boolean, p: Project, owner?:string) {
  const code = nativeControlledDraw(p, l, aod, (input) => draw(input, aod, generationDevice(p).screenWidth/454,undefined,useLibraryIconMask(p,input)));
  return mappedDraw(code ? `if(${nativeVisibility(l, aod)}){${code}}` : "",{layerId:owner || l.id,partId:l.id,capabilityId:"core."+l.kind,mode:aod?"aod":"active"});
}
export function localGenerate(p: Project) {
  const bitmapIssues=bitmapFontDiagnostics(p);if(bitmapIssues.length)throw Error(bitmapIssues.map(x=>x.message).join("；"));
  const owners=new Map(p.layers.flatMap(l=>(l.compound?.layers || []).map(c=>[c.id,l.id])));
  p = expandWidgets(p);
  if (
    p.layers.some((l) => l.exportIncluded !== false && l.effectPrompt?.trim())
  )
    throw Error(
      "设计含原生效果说明，请使用AI生成工程，或清除说明后使用本地生成；本地生成不会静默忽略效果。",
    );
  validateControls(p);
  const configurationIssues = localConfigurationDiagnostics(p);
  if (configurationIssues.length) throw Error("本地生成配置不支持：" + configurationIssues.map(d => d.message).join("；"));
  const runtimeProject=p;
  p = resolveControls(p,true);
  const settings = nativeControls(p);
  p.layers.forEach((l) => validateVisibility(l.visibility));
  const included = p.layers.filter((l) => l.exportIncluded !== false);
  const charts=included.filter(l=>l.kind==="chart");
  if(charts.length>4 || (charts.length && !["venu445mm","venu441mm"].includes(p.target||"venu445mm")))throw Error("每日图表仅开放Venu4两尺寸，最多4个");
  charts.forEach(validateChart);
  const hourlyCharts=charts.some(l=>chartConfig(l).unit==="hour"),dailyCharts=charts.some(l=>chartConfig(l).unit==="day");
  const curved=included.filter(l=>l.kind==="arcText");
  if(curved.length && (!capabilityCatalog.rules.arcText.targets.includes(p.target||"venu445mm")||curved.length>capabilityCatalog.rules.arcText.maxLayers))throw Error("本地曲线文字仅开放Venu4两尺寸，且最多8层；其他目标仍可保留设计草稿。");
  const unsupported = included.filter(
    (l) => localLayerDiagnostics(l).length > 0,
  );
  if (unsupported.length)
    throw Error(
      "本地生成试验仅支持时间、日期、三周日历、文字报时、文字、基础形状、步数/电量目标仪表、步数/电量/秒数/距离/总热量/纯数字心率数据、静态图片和内置图标（仅rect/line/circle/polygon支持旋转，其他类型需未旋转；心率需关闭心形符号）。请移除或排除：" +
        unsupported.map((l) => l.name+"（"+localLayerDiagnostics(l).map(d=>d.message).join("；")+"）").join("、"),
    );
  const imageLayers = included.filter(
    (l) => (l.kind === "image" || !!l.handBitmap) && !l.libraryIcon && !l.iconMask,
  );
  if (new Set(imageLayers.map(bitmapId)).size !== imageLayers.length)
    throw Error("图片资源标识重复");
  const device = generationDevice(p);
  const imageResources = imageLayers
    .map(
      (l) =>
        `<bitmap id="${bitmapId(l)}" filename="../../${imageAssetPath(l)}" ${l.imageFullColor ? 'packingFormat="png" automaticPalette="false" dithering="none" ' : ""}scaleX="${((Math.max(1, Math.round((l.w * device.screenWidth) / 454)) / device.screenWidth) * 100).toFixed(8)}%" scaleY="${((Math.max(1, Math.round((l.h * device.screenHeight) / 454)) / device.screenHeight) * 100).toFixed(8)}%" scaleRelativeTo="screen"/>`,
    )
    .join("");
  const requirements = generationRequirements(p);
  if (
    included.some((l) => {
      const text =
        l.kind === "text"
          ? l.text
          : l.kind === "metric"
            ? (l.label || "") + (l.unit || "") + (l.missingValue || "")
            : "";
      return (
        /[^\x20-\x7e\n\r\t]/.test(text) && !l.customFont &&
        !(l.garminFont === "chalk" && !/[^\x20-\x7e°]/.test(text)) &&
        !(
          (l.garminFont === "systemXTiny" || l.garminFont === "chalkHan") &&
          !/[^\x20-\x7e\n\r\t\p{Script=Han}]/u.test(text)
        )
      );
    })
  )
    throw Error(
      "画布中文文字需指定已验证的 SYSTEM_XTINY 或本地字体；项目名称不受画布字形限制。",
    );
  const chalk = chalkPlans(runtimeProject);
  const masks=included.filter(l=>l.iconMask);
  if(included.some(l=>l.kind==="moon"&&Math.max(Math.trunc(l.w*generationDevice(p).screenWidth/454),Math.trunc(l.h*generationDevice(p).screenWidth/454))>128))throw Error("月相图标物理尺寸超过128px预算");
  if(included.filter(l=>l.kind==="moon").length>8)throw Error("月相图标超过8层预算");
  if(masks.length>96)throw Error("单色图标超过96个");
  const meters = included.filter((l) => l.kind === "meter");
  const dataSources = [
    ...new Set([
      ...(p.controls || []).flatMap((c) =>
        c.type === "dataSource" ? c.options || [] : [],
      ),
      ...included.flatMap((l) => [
        ...(l.kind === "metric" || l.kind === "meter" || (l.kind === "chart" && chartConfig(l).unit==="day")
          ? [l.source]
          : l.kind === "ring" && l.ringSource !== "static"
            ? [l.ringSource || "seconds"]
            : []),
        ...(l.visibility ? [l.visibility.source] : []),
      ]),
    ]),
  ];
  const extraMetrics=extraNativeMetrics(dataSources);
  const activitySources = dataSources.filter((s) =>
    ["steps", "distance", "calories", "floorsClimbed", "intensityMinutes", "moveBarLevel"].includes(s),
  );
  const dataReads =
    (activitySources.length
      ? `try {currentActivityInfo=ActivityMonitor.getInfo();var info=currentActivityInfo;if(info!=null){${activitySources.map((s) => s==="intensityMinutes"?`try{if((info has :activeMinutesDay)&&info.activeMinutesDay!=null&&(info.activeMinutesDay has :total)){dataintensityMinutes=info.activeMinutesDay.total;}}catch(e){}`:`if(info has :${s}){data${s}=info.${s}${s === "distance" ? "==null ? null : info.distance/100000.0" : ""};}`).join("")}}}catch(e){}`
      : "") +
    (dataSources.includes("battery")
      ? "try {databattery=System.getSystemStats().battery;}catch(e){}"
      : "") +
    (dataSources.includes("heartRate")
      ? "try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}"
      : "") +
    extraMetrics.reads;
  const temperature = extraMetrics.needsWeather;
  const metrics = included.some((l) => l.kind === "metric"||l.kind==="meter");
  const date = included.some((l) => l.kind === "date" || l.kind === "calendar");
  const zones = [
    ...new Set(
      included
        .filter((l) => l.kind === "time" && l.timeUtcOffset !== undefined)
        .map((l) => l.timeUtcOffset!),
    ),
  ];
  const rings = included.some((l) => l.kind === "ring");
  const hands = included.some((l) => l.kind === "hand");
  const celestial = included.some((l) => l.kind === "celestial");
  const calendars = included.some((l) => l.kind === "calendar");
  const calendarHelpers = calendars
    ? `
 var calendarStamp=0;var mondayCells=null;var sundayCells=null;
 function calendarMonthDays(year,month){if(month==2 && (year%400==0 || (year%4==0 && year%100!=0))){return 29;}return [31,28,31,30,31,30,31,31,30,31,30,31][month-1];}
 function calendarCells(info,start){
  var stamp=info.year*10000+info.month*100+info.day;
  if(stamp!=calendarStamp){calendarStamp=stamp;mondayCells=null;sundayCells=null;}
  if(start==1 && mondayCells!=null){return mondayCells;}if(start==0 && sundayCells!=null){return sundayCells;}
  var offset=-7-(info.day_of_week-1-start+7)%7;var cells=[];
  for(var i=0;i<21;i++){var y=info.year;var m=info.month;var d=info.day+offset+i;
   while(d<1){m--;if(m<1){m=12;y--;}d+=calendarMonthDays(y,m);}
   while(d>calendarMonthDays(y,m)){d-=calendarMonthDays(y,m);m++;if(m>12){m=1;y++;}}
   cells.add([d,m!=info.month,offset+i==0]);
  }
  if(start==1){mondayCells=cells;}else{sundayCells=cells;}return cells;
 }
 function calendarPaint(dc,ink){dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}
 function drawCalendar(dc,info,start,x,y,w,h,textFont,normal,muted,header,highlight,todayText){
  var names=["Su","Mo","Tu","We","Th","Fr","Sa"];var cells=calendarCells(info,start);
  calendarPaint(dc,header);
  for(var col=0;col<7;col++){dc.drawText(px(x+(col+0.5)*w/7),px(y+h/8),textFont,names[(start+col)%7],Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
  for(var i=0;i<21;i++){var cx=x+(i%7+0.5)*w/7;var cy=y+((i/7).toNumber()+1.5)*h/4;
   if(cells[i][2]){calendarPaint(dc,highlight);var radius=w/7.0;if(h/4.0<radius){radius=h/4.0;}dc.fillCircle(px(cx),px(cy),px(radius*0.43));}
   calendarPaint(dc,cells[i][2]?todayText:(cells[i][1]?muted:normal));dc.drawText(px(cx),px(cy),textFont,cells[i][0].format("%d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
  }
 }
`
    : "";
  const dataHelpers = metrics
    ? `${nativeMetricValidation()}
 function metricText(value,source,label,unit,precision,missing,group){
  if(!metricValid(value,source)){return label+missing;}
  if(source.equals("sunrise")||source.equals("sunset")){return label+(value/3600).toNumber().format("%02d")+":"+((value%3600)/60).toNumber().format("%02d")+unit;}
  if(source.equals("moonIllumination")){label+="~";}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){text=value.toNumber().format("%d");}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  if(group){var cut=text.length();for(var c=0;c<text.length();c++){if(text.substring(c,c+1).equals(".")){cut=c;break;}}var grouped="";for(var k=0;k<text.length();k++){if(k>0 && k<cut && (cut-k)%3==0 && !text.substring(k-1,k).equals("-")){grouped+=",";}grouped+=text.substring(k,k+1);}text=grouped;}

  return label+text+unit;
 }`
    : "";
  const contextFields=[{name:"bg"},{name:"clock"},...dataSources.filter(s=>s!=="seconds").map(s=>({name:"data"+s})),...settings.frameVariables,...(date?[{name:"calendar"},{name:"dateText"},...(included.some(l=>l.kind === "date" && l.dateLocale === "zh")?[{name:"dateZh"}]:[])]:[]),...(included.some(l=>l.dateFormat === "monthDayWeek")?[{name:"dateMonthDayWeek"}]:[]),...(celestial?[{name:"solar"}]:[]),...zones.map(z=>({name:nativeClock(z)}))] as {name:string;type?:string}[];
  const renderMethods:string[]=[],renderCalls:{active:string[];aod:string[]}={active:[],aod:[]};
  for(const mode of ["active","aod"] as const){const draws=included.map(l=>visibleDraw(l,mode === "aod",runtimeProject,owners.get(l.id))).filter(Boolean);for(let i=0;i<draws.length;i+=4){const name="render_"+mode+"_"+(i/4),body=draws.slice(i,i+4).join("\n"),fields=contextFields.filter(f=>new RegExp("\\b"+f.name+"\\b").test(body));if(body.length>30000)throw Error("本地绘制段超过保守源码预算，请减少该段的配置选项或阈值规则");renderMethods.push(`function ${name}(dc as Graphics.Dc) as Void {${fields.map(f=>`var ${f.name}=frameContext[:${f.name}]${f.type?" as "+f.type:""};`).join("")}\n${body}\n}`);renderCalls[mode].push(name+"(dc);");}}
  const frameAssignments="frameContext={"+contextFields.map(f=>":"+f.name+"=>"+f.name).join(",")+"};";
  const source = `// GarminFaceCreator local generator ${LOCAL_GENERATOR_VERSION}; approximate system font mapping, no SDK fonts bundled.
// Target ${device.target}; device metadata ${deviceMetadataVersion}; package ${device.metadata.source?.packageVersion || "unknown"}; compiler SHA256 ${device.metadata.source?.compilerSha256 || "unknown"}. Hardware/AOD/power unverified.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;${dataSources.includes("heartRate") || extraMetrics.needsHistory || hourlyCharts ? "import Toybox.SensorHistory;" : ""}${activitySources.length || charts.length ? "import Toybox.ActivityMonitor;" : ""}${date || zones.length || celestial || charts.length || extraMetrics.needsClock ? "import Toybox.Time;import Toybox.Time.Gregorian;" : ""}${celestial ? "import Toybox.Position;" : ""}${celestial || temperature ? "import Toybox.Weather;" : ""}${extraMetrics.needsComplications?"import Toybox.Complications;":""}${celestial || hands || rings || curved.length || imageLayers.length ? "import Toybox.Math;" : ""}${curved.length?"import Toybox.Lang;":""}
class GeneratedApp extends Application.AppBase {var mainView=null;function initialize(){AppBase.initialize();} function getInitialView(){mainView=new GeneratedView();return [mainView];}${p.themes?"function getSettingsView(){return [new GfcSettingsMenu(\"root\",null),new GfcSettingsDelegate()];}":""}${(p.controls?.length||p.themes) ? "function onSettingsChanged(){if(mainView!=null){mainView.settingsCache=null;}WatchUi.requestUpdate();}" : ""}}
class GeneratedView extends WatchUi.WatchFace {
 var gfcMetricCache={};
 ${charts.length?nativeChartHelpers:""}
${hourlyCharts?nativeHourlyChartHelpers:""}
 var sleeping=false;var scale=1.0;var frameContext=null;var gfcFrameReported=false;
 function mixTextInk(ink,alpha,bg){var r=(((ink>>16)&255)*alpha+((bg>>16)&255)*(255-alpha))/255;var g=(((ink>>8)&255)*alpha+((bg>>8)&255)*(255-alpha))/255;var b=((ink&255)*alpha+(bg&255)*(255-alpha))/255;return (r.toNumber()<<16)|(g.toNumber()<<8)|b.toNumber();}
 ${included.some((l) => l.widgetOrigin) ? "function widgetFont(dc,text,preferred,w,h,size){var fonts=[preferred,Graphics.FONT_NUMBER_HOT,Graphics.FONT_LARGE,Graphics.FONT_MEDIUM,Graphics.FONT_SMALL,Graphics.FONT_TINY,Graphics.FONT_XTINY];var chosen=Graphics.FONT_XTINY;var best=0;for(var i=0;i<fonts.size();i++){var height=dc.getFontHeight(fonts[i]);if(height<=h && height<=size*1.35 && height>best && dc.getTextWidthInPixels(text,fonts[i])<=w){chosen=fonts[i];best=height;}}return chosen;}" : ""}
 ${curved.length?nativeCurvedText:""}
 ${settings.helpers}
 function textPaint(dc,ink,alpha){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));if(alpha==255){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}}
 ${(chalk.length||masks.length||usedBitmapFonts(p).length) ? "function fontFor(id){return WatchUi.loadResource(id);}" : ""}

 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;gfcFrameReported=false;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;gfcFrameReported=false;WatchUi.requestUpdate();}
 ${meters.length ? "function meterCount(value,goal,count,source){if(!metricValid(value,source)){return 0;}if(value>=goal){return count;}return (value*1.0/goal*count).toNumber();}" : ""}
 ${dataHelpers}
 ${extraMetrics.helpers}
 ${
   hands
     ? `function drawHand(dc,clock,kind,x,y,w,h,pvx,pvy,reach,tail,stroke,ink,low,roundCap,shape){
  var cx=w*pvx;var cy=h*pvy;var radius=cx;if(w-cx<radius){radius=w-cx;}if(cy<radius){radius=cy;}if(h-cy<radius){radius=h-cy;}radius-=stroke/2.0;if(radius<0){radius=0;}
  var sec=low?0:clock.sec;var degrees=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=degrees*Math.PI/180.0;var dx=Math.sin(a);var dy=-Math.cos(a);
  dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setPenWidth(px(stroke)>0?px(stroke):1);
  if(shape!=null){var points=[];for(var si=0;si<shape.size();si++){var point=shape[si];var along=point[1]*radius*(point[1]>=0?reach:tail);var across=point[0]*stroke/2.0;points.add([px(x+cx+dx*along-dy*across),px(y+cy+dy*along+dx*across)]);}dc.fillPolygon(points);return;}
  dc.drawLine(px(x+cx-dx*radius*tail),px(y+cy-dy*radius*tail),px(x+cx+dx*radius*reach),px(y+cy+dy*radius*reach));
  if(roundCap){dc.fillCircle(px(x+cx-dx*radius*tail),px(y+cy-dy*radius*tail),px(stroke/2));dc.fillCircle(px(x+cx+dx*radius*reach),px(y+cy+dy*radius*reach),px(stroke/2));}
 }`
     : ""
 }
 ${calendarHelpers}
 ${
   celestial
     ? `
 var solarMinute=-1;var solarCached=[-1,0.0];var solarEventKey="";var solarRises=[];var solarSets=[];
 function getSolarState(){
  var now=Time.now();var stamp=(now.value()/60).toNumber();if(solarMinute==stamp){return solarCached;}solarMinute=stamp;solarCached=[-1,0.0];
  try{if((Toybox has :Position)&&(Toybox has :Weather)&&(Position has :getInfo)&&(Weather has :getSunrise)&&(Weather has :getSunset)){
   var info=Position.getInfo();if(info!=null && info.position!=null){
    var coords=info.position.toDegrees();var key=(now.value()/86400).toNumber().format("%d")+":"+coords[0].format("%.6f")+":"+coords[1].format("%.6f");
    if(key!=solarEventKey){solarRises=[];solarSets=[];for(var day=-1;day<=1;day++){var query=new Time.Moment(now.value()+day*86400);var rise=Weather.getSunrise(info.position,query);var set=Weather.getSunset(info.position,query);if(rise!=null){solarRises.add(rise.value());}if(set!=null){solarSets.add(set.value());}}solarEventKey=key;}
    var value=now.value();var lastRise=-1;var lastSet=-1;var nextRise=-1;var nextSet=-1;
    for(var i=0;i<solarRises.size();i++){var r=solarRises[i];if(r<=value && r>lastRise){lastRise=r;}if(r>value && (nextRise<0 || r<nextRise)){nextRise=r;}}
    for(var j=0;j<solarSets.size();j++){var t=solarSets[j];if(t<=value && t>lastSet){lastSet=t;}if(t>value && (nextSet<0 || t<nextSet)){nextSet=t;}}
    if(lastRise>lastSet && lastRise>=0 && nextSet>value && value-lastRise<86400 && nextSet-value<86400){solarCached=[1,(value-lastRise)*1.0/(nextSet-lastRise)];}
    else if(lastSet>lastRise && lastSet>=0 && nextRise>value && value-lastSet<86400 && nextRise-value<86400){solarCached=[0,0.5];}
   }else{solarEventKey="";}
  }}catch(e){solarEventKey="";}return solarCached;
 }
 function solarPaint(dc,ink){dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}
 function drawCelestial(dc,state,part,x,y,w,h,day,night,missing){
  var mode=state[0];var p=state[1];
  if(part==0){solarPaint(dc,mode==1?day:(mode==0?night:missing));dc.fillRectangle(px(x),px(y),px(w),px(h));if(mode<0){solarPaint(dc,0x9aabbc);dc.drawText(px(x+w/2),px(y+h/2),Graphics.FONT_XTINY,"N/A",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}return;}
  if(mode<0){return;}if(p<0){p=0;}if(p>1){p=1;}var radius=(w<h?w:h)*0.09;var cx=x+w*(0.15+0.7*p);var cy=y+h*(0.84-0.65*Math.sin(Math.PI*p));
  solarPaint(dc,mode==1?day:night);dc.setPenWidth(px(2)>0?px(2):1);if(mode==1){dc.fillCircle(px(cx),px(cy),px(radius));for(var i=0;i<8;i++){var a=i*Math.PI/4;dc.drawLine(px(cx+Math.cos(a)*radius*1.25),px(cy+Math.sin(a)*radius*1.25),px(cx+Math.cos(a)*radius*1.55),px(cy+Math.sin(a)*radius*1.55));}}else{dc.drawCircle(px(cx),px(cy),px(radius));dc.fillCircle(px(cx+radius*0.25),px(cy-radius*0.2),px(radius*0.13));dc.fillCircle(px(cx-radius*0.3),px(cy+radius*0.2),px(radius*0.18));}
 }
 `
     : ""
 }
 ${
   imageLayers.length
     ? `var bitmapCache={};var bitmapUsed={};
 function drawStaticImage(dc,id,x,y){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}dc.drawBitmap(x,y,bitmapCache[id]);}
 function drawBitmapHand(dc,clock,id,kind,x,y,w,h,pvx,pvy,low,tint){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}var bitmap=bitmapCache[id];var cx=w*pvx;var cy=h*pvy;var r=cx;if(w-cx<r){r=w-cx;}if(cy<r){r=cy;}if(h-cy<r){r=h-cy;}if(r<=0){return;}var sec=low?0:clock.sec;var deg=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=deg*Math.PI/180.0;var transform=new Graphics.AffineTransform();transform.translate((px(x+cx)*1.0),(px(y+cy)*1.0));transform.rotate(a);transform.scale(px(r*2)*1.0/bitmap.getWidth(),px(r*2)*1.0/bitmap.getHeight());transform.translate(-bitmap.getWidth()/2.0,-bitmap.getHeight()/2.0);var options={:transform=>transform};if(low){options[:tintColor]=tint;}dc.drawBitmap2(0,0,bitmap,options);}
 function trimImages(){var keys=bitmapCache.keys();for(var i=0;i<keys.size();i++){if(!bitmapUsed.hasKey(keys[i])){bitmapCache.remove(keys[i]);}}}`
     : ""
 }
 ${rings ? nativeArcMethod : ""}
 ${rings ? `function drawTickRing(dc,x,y,w,h,count,start,end,ink,dim,value,goal,battery,hr,low,stroke){var lit=0;if(!low && value!=null && value==value && value>=0 && value<1.0e12 && (!battery || value<=100) && (!hr || value>0)){lit=value>=goal?count:(value*1.0/goal*count).toNumber();}var span=end-start;var divisor=Math.abs(span)==360?count:count-1;var major=(count/12.0+0.5).toNumber();if(major<1){major=1;}for(var i=0;i<count;i++){var a=(start+i*span/divisor)*Math.PI/180.0;var alpha=i<lit?255:(dim*255).toNumber();dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));var pen=px(stroke*(i%major==0?1.5:1.0));dc.setPenWidth(pen>0?pen:1);dc.drawLine(px(x+w/2.0+Math.sin(a)*(w/2.0-9)),px(y+h/2.0-Math.cos(a)*(h/2.0-9)),px(x+w/2.0+Math.sin(a)*w/2.0),px(y+h/2.0-Math.cos(a)*h/2.0));}}` : ""}
 function px(value){return (value*scale).toNumber();}
 ${renderMethods.join("\n")}
 function onUpdate(dc as Graphics.Dc) as Void {
  frameContext=null;
  ${imageLayers.length ? "bitmapUsed={};" : ""}${settings.frame}scale=dc.getWidth()/454.0;var clock=System.getClockTime();${celestial ? "var solar=sleeping?solarCached:getSolarState();" : ""}${zones.length ? "var zoneNow=Time.now();" + zones.map((offset) => `var ${nativeClock(offset)}=Gregorian.utcInfo(new Time.Moment(zoneNow.value()+${offset * 60}),Time.FORMAT_SHORT);`).join("") : ""}${dataSources
    .filter((s) => s !== "seconds")
    .map((s) => `var data${s}=null;`)
    .join(
      "",
    )}var currentActivityInfo=null;if(!sleeping){${dataReads}${dailyCharts?"refreshChartHistory(currentActivityInfo);":""}${hourlyCharts?"refreshHourlyChart();":""}${dataSources.filter(s=>s!=="seconds").map(s=>`gfcMetricCache[:${s}]=data${s};`).join("")}}else{${dataSources.filter(s=>s!=="seconds").map(s=>`if(gfcMetricCache.hasKey(:${s})){data${s}=gfcMetricCache[:${s}];}`).join("")}}${date ? 'var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");' + (included.some((l) => l.kind === "date" && l.dateLocale === "zh") ? 'var dateZh="周"+["日","一","二","三","四","五","六"][calendar.day_of_week-1]+" "+calendar.month.format("%d")+"月"+calendar.day.format("%d")+"日";' : "") : ""}
  ${included.some(l=>l.weatherIcon&&l.libraryIcon)?"GfcIcons.prepare(sleeping);":""}
  ${included.some((l) => l.dateFormat === "monthDayWeek") ? 'var dateMonthDayWeek=calendar.month.format("%02d")+"."+calendar.day.format("%02d")+" "+["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1];' : ""}
  ${`var bg=sleeping?Graphics.COLOR_BLACK:${p.themes?"cfgThemeBackground":color(p.backgroundColor || "#000000")};dc.setColor(bg,bg);`}dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  ${frameAssignments}
  if(sleeping){${renderCalls.aod.join("")}}else{${renderCalls.active.join("")}}
  frameContext=null;
  ${imageLayers.length ? "trimImages();" : ""}
  if(!gfcFrameReported){System.println("GFC_RENDER_READY target=${device.target} mode="+(sleeping?"aod":"active"));gfcFrameReported=true;}
 }
}`;
  return parseFiles(
    JSON.stringify({
      files: mergeNativeWordTime(
        p,
        mergeNativeIcons(p, [
          ...settings.menuFiles,...nativeBitmapFontFiles(runtimeProject),...nativeMoonFiles(runtimeProject),
          { path: "manifest.xml", content: generationManifest(p) },
          {
            path: "monkey.jungle",
            content:
              "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources\n",
          },
          { path: "source/App.mc", content: source },
          ...settings.files,
          ...((chalk.length||masks.length||usedBitmapFonts(p).length)
            ? [
                {
                  path: "resources/fonts/fonts.xml",
                  content: `<fonts>${[...chalk.map(plan=>plan.id),...new Set(masks.map(iconMaskId)),...usedBitmapFonts(runtimeProject).map(f=>bitmapFontResourceId(f.id))].map(id=>`<font id="${id}" filename="${id}.fnt" antialias="true"/>`).join("")}</fonts>`,
                },
              ]
            : []),
          {
            path: "resources/strings/strings.xml",
            content: `<strings><string id="AppName">${xml(p.name)}</string></strings>`,
          },
          {
            path: "resources/drawables/drawables.xml",
            content: `<drawables><bitmap id="LauncherIcon" filename="icon.svg"/>${imageResources}</drawables>`,
          },
          {
            path: "resources/drawables/icon.svg",
            content:
              '<svg xmlns="http://www.w3.org/2000/svg" width="65" height="65"><circle cx="32" cy="32" r="28" fill="#45d6be"/></svg>',
          },
        ]),
      ),
    }),
  );
}

