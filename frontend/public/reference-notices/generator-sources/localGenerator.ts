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
export const LOCAL_GENERATOR_VERSION = "basic-13-paint";
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
function primitive(l: Layer, aod: boolean) {
  const fill = color(aod ? l.aodColor || "#777777" : l.color),
    stroke = color(aod ? l.aodColor || "#777777" : l.strokeColor || l.color);
  const alpha = Math.round((l.opacity ?? 1) * 255);
  const fillPaint = `dc.setColor(${fill},Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(${alpha},(${fill}>>16)&255,(${fill}>>8)&255,${fill}&255));`;
  const strokePaint = `dc.setColor(${stroke},Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(${alpha},(${stroke}>>16)&255,(${stroke}>>8)&255,${stroke}&255));dc.setPenWidth(px(${num(l.strokeWidth || 2)})>0?px(${num(l.strokeWidth || 2)}):1);`;
  if (l.kind === "line")
    return l.strokeEnabled === false
      ? ""
      : strokePaint +
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
    `var polygon=${array};` +
    (l.fillEnabled === false ? "" : fillPaint + "dc.fillPolygon(polygon);") +
    (l.strokeEnabled
      ? strokePaint +
        "for(var i=0;i<polygon.size();i++){var j=(i+1)%polygon.size();dc.drawLine(polygon[i][0],polygon[i][1],polygon[j][0],polygon[j][1]);}"
      : "")
  );
}
function draw(l: Layer, aod: boolean) {
  if (
    aod &&
    (!l.aod ||
      (l.kind === "metric" &&
        l.source === "seconds" &&
        l.aodSeconds === "hide"))
  )
    return "";
  if (l.kind === "hand") {
    if (aod && l.handType === "second" && l.aodSeconds === "hide") return "";
    return `drawHand(dc,clock,${l.handType === "second" ? 2 : l.handType === "minute" ? 1 : 0},${num(l.x)},${num(l.y)},${num(l.w)},${num(l.h)},${num(l.handPivotX ?? 0.5)},${num(l.handPivotY ?? 0.5)},${num(l.handReach ?? 0.58)},${num(l.handTail ?? 0.08)},${num(l.strokeWidth || 6)},${color(aod ? l.aodColor || "#777777" : l.color)},${aod ? "true" : "false"});`;
  }
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
  if (l.kind === "meter") {
    const ink = color(aod ? l.aodColor || "#777777" : l.color),
      goal = l.meterGoal ?? (l.source === "battery" ? 100 : 10000),
      count = l.meterCount ?? 16;
    return (
      `{dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);var lit=meterCount(${l.source === "battery" ? "databattery" : "datasteps"},${num(goal)},${count},${l.source === "battery" ? "true" : "false"});` +
      meterPolygons(l)
        .map(
          (points, i) =>
            `dc.setFill(Graphics.createColor(${i}<lit?255:${Math.round((l.meterDim ?? 0.35) * 255)},(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.fillPolygon([${points.map(([x, y]) => `[px(${num(l.x + x)}),px(${num(l.y + y)})]`).join(",")}]);`,
        )
        .join("") +
      `}`
    );
  }
  if (l.kind === "image" && l.libraryIcon)
    return `GfcIcons.${iconDrawMethod(l)}(dc,px(${num(l.x)}),px(${num(l.y)}));`;
  if (["rect", "circle", "line"].includes(l.kind))
    return `{${primitive(l, aod)}}`;
  const align = l.textAlign || "center",
    x = l.x + (align === "left" ? 0 : align === "right" ? l.w : l.w / 2);
  const content =
    l.kind === "time"
      ? nativeTimeText(l.timePart, nativeClock(l.timeUtcOffset))
      : l.kind === "date"
        ? "dateText"
        : l.kind === "metric"
          ? `metricText(value,${JSON.stringify(l.source)},${JSON.stringify(l.label ? l.label + " " : "")},${JSON.stringify(l.unit ?? metricDisplayUnits[l.source] ?? "")},${l.precision ?? -1},${JSON.stringify(l.missingValue ?? "--")})`
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
        `var ink=${color(l.thresholdFallback || l.color)};if(metricValid(value,${l.source === "battery" ? "true" : "false"})){` +
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
  const ink = paint;
  return (
    prefix +
    `dc.setFill(Graphics.createColor(255,(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.setStroke(Graphics.createColor(255,(${ink}>>16)&255,(${ink}>>8)&255,${ink}&255));dc.setColor(${ink},Graphics.COLOR_TRANSPARENT);dc.drawText(px(${num(x)}),px(${num(l.y + l.h / 2)}),${font(l, aod)},${content},Graphics.TEXT_JUSTIFY_${align.toUpperCase()}|Graphics.TEXT_JUSTIFY_VCENTER);` +
    suffix
  );
}
export function localGenerate(p: Project) {
  const included = p.layers.filter((l) => l.exportIncluded !== false);
  const unsupported = included.filter(
    (l) =>
      (![
        "time",
        "date",
        "calendar",
        "celestial",
        "hand",
        "wordTime",
        "metric",
        "text",
        "rect",
        "circle",
        "line",
        "meter",
      ].includes(l.kind) &&
        !(l.kind === "image" && l.libraryIcon)) ||
      l.rotation !== 0 ||
      (l.kind === "meter" && !["steps", "battery"].includes(l.source)) ||
      (l.kind === "metric" &&
        ![
          "steps",
          "battery",
          "seconds",
          "distance",
          "calories",
          "heartRate",
        ].includes(l.source)) ||
      (l.kind === "metric" &&
        l.source === "heartRate" &&
        l.metricDecoration !== false),
  );
  if (unsupported.length)
    throw Error(
      "本地生成试验仅支持未旋转的时间、日期、三周日历、文字报时、文字、基础形状、步数/电量目标仪表、步数/电量/秒数/距离/总热量/纯数字心率数据和内置图标（心率需关闭心形符号）。请移除或排除：" +
        unsupported.map((l) => l.name).join("、"),
    );
  const requirements = generationRequirements(p);
  if (
    requirements.languages.length > 1 &&
    !included.some((l) => l.kind === "wordTime" && l.wordLanguage === "zh")
  )
    throw Error(
      "本地生成试验尚未验证非英文系统字形。请使用 ASCII 项目名和文字，或使用 AI 生成并提供已授权字体。",
    );
  if (
    /[^\x20-\x7e\n\r\t]/.test(
      p.name +
        included
          .map((l) =>
            l.kind === "text"
              ? l.text
              : l.kind === "metric"
                ? (l.label || "") + (l.unit || "") + (l.missingValue || "")
                : "",
          )
          .join(""),
    )
  )
    throw Error(
      "本地生成试验只支持 ASCII 文字；其他文字请先使用 AI 字体方案。",
    );
  const meters = included.filter((l) => l.kind === "meter");
  const dataSources = [
    ...new Set(
      included
        .filter((l) => l.kind === "metric" || l.kind === "meter")
        .map((l) => l.source),
    ),
  ];
  const activitySources = dataSources.filter((s) =>
    ["steps", "distance", "calories"].includes(s),
  );
  const dataReads =
    (activitySources.length
      ? `try {var info=ActivityMonitor.getInfo();if(info!=null){${activitySources.map((s) => `if(info has :${s}){data${s}=info.${s}${s === "distance" ? "==null ? null : info.distance/100000.0" : ""};}`).join("")}}}catch(e){}`
      : "") +
    (dataSources.includes("battery")
      ? "try {databattery=System.getSystemStats().battery;}catch(e){}"
      : "") +
    (dataSources.includes("heartRate")
      ? "try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}"
      : "");
  const metrics = included.some((l) => l.kind === "metric");
  const date = included.some((l) => l.kind === "date" || l.kind === "calendar");
  const zones = [
    ...new Set(
      included
        .filter((l) => l.kind === "time" && l.timeUtcOffset !== undefined)
        .map((l) => l.timeUtcOffset!),
    ),
  ];
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
    ? `function metricValid(value,battery){return value!=null && value==value && value>=0 && value<1.0e12 && (!battery || value<=100);}
 function metricText(value,source,label,unit,precision,missing){
  if(!metricValid(value,source.equals("battery"))){return label+missing;}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){var digits=value.toNumber().format("%d");var length=digits.length();for(var i=0;i<length;i++){if(i>0 && (length-i)%3==0){text+=",";}text+=digits.substring(i,i+1);}}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  return label+text+unit;
 }`
    : "";
  const source = `// GarminFaceCreator local generator ${LOCAL_GENERATOR_VERSION}; approximate system font mapping, no SDK fonts bundled.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;${dataSources.includes("heartRate") ? "import Toybox.SensorHistory;" : ""}${activitySources.length ? "import Toybox.ActivityMonitor;" : ""}${date || zones.length || celestial ? "import Toybox.Time;import Toybox.Time.Gregorian;" : ""}${celestial ? "import Toybox.Position;import Toybox.Weather;" : ""}${celestial || hands ? "import Toybox.Math;" : ""}
class GeneratedApp extends Application.AppBase {function initialize(){AppBase.initialize();} function getInitialView(){return [new GeneratedView()];}}
class GeneratedView extends WatchUi.WatchFace {
 var sleeping=false;var scale=1.0;
 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 ${meters.length ? "function meterCount(value,goal,count,battery){if(value==null || value!=value || value<0 || value>1.0e12 || (battery && value>100)){return 0;}if(value>=goal){return count;}return (value*1.0/goal*count).toNumber();}" : ""}
 ${dataHelpers}
 ${
   hands
     ? `function drawHand(dc,clock,kind,x,y,w,h,pvx,pvy,reach,tail,stroke,ink,low){
  var cx=w*pvx;var cy=h*pvy;var radius=cx;if(w-cx<radius){radius=w-cx;}if(cy<radius){radius=cy;}if(h-cy<radius){radius=h-cy;}radius-=stroke/2.0;if(radius<0){radius=0;}
  var sec=low?0:clock.sec;var degrees=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=degrees*Math.PI/180.0;var dx=Math.sin(a);var dy=-Math.cos(a);
  dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setPenWidth(px(stroke)>0?px(stroke):1);
  dc.drawLine(px(x+cx-dx*radius*tail),px(y+cy-dy*radius*tail),px(x+cx+dx*radius*reach),px(y+cy+dy*radius*reach));
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
 function px(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  scale=dc.getWidth()/454.0;var clock=System.getClockTime();${celestial ? "var solar=sleeping?solarCached:getSolarState();" : ""}${zones.length ? "var zoneNow=Time.now();" + zones.map((offset) => `var ${nativeClock(offset)}=Gregorian.utcInfo(new Time.Moment(zoneNow.value()+${offset * 60}),Time.FORMAT_SHORT);`).join("") : ""}${dataSources
    .filter((s) => s !== "seconds")
    .map((s) => `var data${s}=null;`)
    .join(
      "",
    )}${dataReads}${date ? 'var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");' : ""}
  dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  if(sleeping){${included.map((l) => draw(l, true)).join("\n")}}else{${included.map((l) => draw(l, false)).join("\n")}}
 }
}`;
  return parseFiles(
    JSON.stringify({
      files: mergeNativeWordTime(
        p,
        mergeNativeIcons(p, [
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
        ]),
      ),
    }),
  );
}
