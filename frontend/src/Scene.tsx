import {expandWidgets} from "./compound";
import { resolveControls } from "./projectControls";
import { fontFamily, loadCustomFonts } from "./customFonts";
import { conditionVisible } from "./visibility";
import { timeText, timeInOffset } from "./timeParts";
import Hand from "./Hand";
import Celestial from "./Celestial";
import WordTimeWidget from "./WordTimeWidget";
import Calendar from "./CalendarWidget";
import Meter from "./Meter";
import {
  metricDisplayUnits,
  metricDecorations,
  formatMetricValue,
  validMetricValue,
} from "./metricFormat";
import LibraryImage from "./LibraryImage";
import { guideInsetDesign } from "./layouts";
import type { Box } from "./selection";
import { thresholdInk } from "./thresholds";
import { useId, useEffect } from "react";
import type { Project, Layer } from "./domain";
export type Preview = {
  missing?: boolean;
  weatherCondition?: number | null;
  date?: string;
  calendarDate?: string;
  time: string;
  utcOffsetMinutes?: number;
  sunrise?: string;
  sunset?: string;
  heartRate: number;
  steps: number;
  battery: number;
  seconds: number;
};
export function metricValues(d: Preview): Record<string, number> {
  return {
    heartRate: d.heartRate,
    steps: d.steps,
    battery: d.battery,
    calories: 426,
    distance: 6.42,
    temperature: 24,
    stress: 30,
    recoveryHours: 5,
    floorsClimbed: 0,
    intensityMinutes: 0,
    humidity: 62,
    uvIndex: 3,
    altitude: -59,
    windSpeed: 6,
    seconds: d.seconds,
  };
}
export function reading(l: Layer, d: Preview) {
  if (l.kind === "time") {
    const localOffset =
      d.utcOffsetMinutes ??
      -(
        d.calendarDate && /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)
          ? new Date(d.calendarDate + "T" + d.time + ":00")
          : new Date()
      ).getTimezoneOffset();
    return timeText(
      timeInOffset(d.time, l.timeUtcOffset, localOffset),
      l.timePart,
      d.seconds,
    );
  }
  if (l.kind === "date") {
    if (l.dateFormat === "monthDayWeek") {
      const date = new Date((d.calendarDate || "2026-11-23") + "T12:00:00");
      return Number.isFinite(date.getTime())
        ? String(date.getMonth() + 1).padStart(2, "0") +
            "." +
            String(date.getDate()).padStart(2, "0") +
            " " +
            ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()]
        : "--";
    }
    if (l.dateLocale === "zh") {
      const date = d.calendarDate
        ? new Date(d.calendarDate + "T12:00:00")
        : new Date();
      return Number.isFinite(date.getTime())
        ? "周" +
            ["日", "一", "二", "三", "四", "五", "六"][date.getDay()] +
            " " +
            (date.getMonth() + 1) +
            "月" +
            date.getDate() +
            "日"
        : "--";
    }
    return d.date || "MON 23";
  }
  if (l.kind === "text") return l.text;
  if (l.kind === "metric") {
    const values = metricValues(d);
    const units = metricDisplayUnits;
    const value = values[l.source];
    const prefix = l.label ? l.label + " " : "";
    if (d.missing || !validMetricValue(l.source, value))
      return prefix + (l.missingValue ?? "--");
    const text = formatMetricValue(
      l.source,
      value,
      l.precision,
      l.groupThousands,
    );
    return prefix + text + (l.unit ?? units[l.source] ?? "");
  }
  return "";
}
export function ink(l: Layer, d: Preview) {
  if (l.kind !== "metric" || !l.threshold) return l.color;
  return thresholdInk(
    l,
    metricValues(d)[l.source],
    !!d.missing || !validMetricValue(l.source, metricValues(d)[l.source]),
  );
}

export function ringLit(l: Layer, d: Preview, aod = false) {
  if (aod) return 0;
  const source = l.ringSource || "seconds";
  const value =
    source === "static"
      ? 1
      : {
          seconds: d.seconds,
          steps: d.steps,
          battery: d.battery,
          heartRate: d.heartRate,
        }[source];
  if(!Number.isFinite(value)||value<0||(source==="battery"&&value>100)||(source==="heartRate"&&value<=0))return 0;
  const goal =
    source === "static"
      ? 1
      : l.ringGoal ||
        (source === "seconds"
          ? 60
          : source === "steps"
            ? 10000
            : source === "battery"
              ? 100
              : 180);
  return Math.floor(
    (l.ringTicks || 60) *
      Math.max(0, Math.min(1, Number.isFinite(value) ? value / goal : 0)),
  );
}
export default function Scene({
  project,
  preview,
  aod = false,
  selected = "",
  selection = [selected],
  selectionBox,
  exact = false,
  onDown,
}: {
  project: Project;
  preview: Preview;
  aod?: boolean;
  selected?: string;
  selection?: string[];
  selectionBox?: Box | null;
  exact?: boolean;
  onDown?: (
    e: React.PointerEvent<SVGGElement>,
    l: Layer,
    resize?: number,
  ) => void;
}) {
  const sourceLayers=new Map(project.layers.map(l=>[l.id,l]));
  const owners=new Map(project.layers.filter(l=>l.kind==="widget").flatMap(l=>l.compound!.layers.map(c=>[c.id,l] as const)));
  project = resolveControls(expandWidgets(project,!!onDown));
  const fontKey = JSON.stringify(
    project.layers.map((l) => l.customFont).filter(Boolean),
  );
  useEffect(() => {
    void loadCustomFonts(project).catch(() => {});
  }, [fontKey]);
  const clipId = useId().replaceAll(":", "");
  return (
    <svg
      className="watch"
      viewBox={exact ? "0 0 454 454" : "-12 -12 478 478"}
      aria-label="表盘画布"
    >
      <defs>
        <clipPath id={"clip-" + clipId}>
          <circle cx="227" cy="227" r="226" />
        </clipPath>
      </defs>
      <circle
        cx="227"
        cy="227"
        r="227"
        fill={aod ? "#000" : project.backgroundColor || "#07131d"}
        stroke="#53616d"
        strokeWidth="0.7"
      />
      {!exact && project.layoutGuide?.showGuide && (
        <circle
          data-layout-guide="true"
          cx={227}
          cy={227}
          r={227 - guideInsetDesign(project)}
          fill="none"
          stroke="#8096a0"
          strokeDasharray="4 4"
          opacity={0.65}
          pointerEvents="none"
        />
      )}
      <g clipPath={"url(#clip-" + clipId + ")"}>
        {project.layers
          .filter(
            (l) =>
              (exact ? l.exportIncluded !== false : !l.hidden) &&
              (aod || l.activeVisible !== false) &&
              conditionVisible(
                l.visibility,
                preview.missing ? {} : metricValues(preview),
                aod,
              ) &&
              (!aod ||
                (l.aod &&
                  !(
                    l.aodSeconds === "hide" &&
                    ((l.kind === "metric" && l.source === "seconds") ||
                      l.kind === "ring")
                  ))),
          )
          .map((l) => (
            <g
              key={l.id}
              data-layer={owners.get(l.id)?.id||l.id}
              data-widget-part={owners.has(l.id)?l.id:undefined}
              data-guide={l.guide ? "true" : undefined}
              transform={`translate(${l.x} ${l.y}) rotate(${l.rotation} ${l.w / 2} ${l.h / 2})`}
              onPointerDown={(e) => onDown?.(e, owners.get(l.id)||sourceLayers.get(l.id)||l)}
              style={{
                cursor: l.locked ? "not-allowed" : onDown ? "move" : "default",
              }}
            >
              {l.kind === "hand" ? (
                <Hand layer={l} preview={preview} aod={aod} />
              ) : l.kind === "celestial" ? (
                <Celestial layer={l} preview={preview} aod={aod} />
              ) : l.kind === "wordTime" ? (
                <WordTimeWidget
                  layer={l}
                  time={preview.time}
                  seconds={preview.seconds}
                  aod={aod}
                />
              ) : l.kind === "calendar" ? (
                <Calendar layer={l} date={preview.calendarDate} aod={aod} />
              ) : l.kind === "meter" ? (
                <Meter
                  layer={l}
                  value={metricValues(preview)[l.source]}
                  missing={preview.missing}
                  aod={aod}
                />
              ) : l.kind === "ring" ? (
                Array.from({ length: l.ringTicks || 60 }, (_, i) => {
                  const count = l.ringTicks || 60,
                    start = l.ringStart ?? 0,
                    end = l.ringEnd ?? 360;
                  const a =
                    ((start +
                      (i * (end - start)) /
                        (Math.abs(end - start) === 360
                          ? count
                          : Math.max(1, count - 1))) *
                      Math.PI) /
                    180;
                  return (
                    <line
                      key={i}
                      x1={l.w / 2 + Math.sin(a) * (l.w / 2 - 9)}
                      y1={l.h / 2 - Math.cos(a) * (l.h / 2 - 9)}
                      x2={l.w / 2 + (Math.sin(a) * l.w) / 2}
                      y2={l.h / 2 - (Math.cos(a) * l.h) / 2}
                      stroke={aod ? l.aodColor || "#777777" : l.color}
                      strokeWidth={
                        (l.ringWidth || 2) *
                        (i %
                          Math.max(1, Math.round((l.ringTicks || 60) / 12)) ===
                        0
                          ? 1.5
                          : 1)
                      }
                      opacity={
                        i < ringLit(l, preview, aod) ? 1 : (l.ringDim ?? 0.25)
                      }
                    />
                  );
                })
              ) : l.kind === "image" ? (
                <LibraryImage
                  layer={l}
                  condition={preview.weatherCondition}
                  missing={preview.missing}
                />
              ) : l.kind === "rect" ? (
                <rect
                  width={l.w}
                  height={l.h}
                  fill={
                    l.fillEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.color
                  }
                  rx={l.cornerRadius ?? 4}
                  fillOpacity={l.opacity ?? 1}
                  stroke={
                    l.strokeEnabled
                      ? aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                      : "none"
                  }
                  strokeWidth={l.strokeWidth || 2}
                  strokeOpacity={l.opacity ?? 1}
                />
              ) : l.kind === "circle" ? (
                <ellipse
                  cx={l.w / 2}
                  cy={l.h / 2}
                  rx={l.w / 2}
                  ry={l.h / 2}
                  fill={
                    l.fillEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.color
                  }
                  fillOpacity={l.opacity ?? 1}
                  stroke={
                    l.strokeEnabled
                      ? aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                      : "none"
                  }
                  strokeWidth={l.strokeWidth || 2}
                  strokeOpacity={l.opacity ?? 1}
                />
              ) : l.kind === "line" ? (
                <line
                  x1="0"
                  y1="0"
                  x2={l.w}
                  y2={l.h}
                  stroke={
                    l.strokeEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                  }
                  strokeWidth={l.strokeWidth || 2}
                  strokeOpacity={l.opacity ?? 1}
                  strokeDasharray={l.guide ? "6 4" : undefined}
                  strokeLinecap={(l.strokeWidth || 2) > 2 ? "round" : "butt"}
                />
              ) : (
                <text
                  x={
                    l.textAlign === "left"
                      ? 0
                      : l.textAlign === "right"
                        ? l.w
                        : l.w / 2
                  }
                  y={l.h / 2}
                  dominantBaseline="central"
                  textAnchor={
                    l.textAlign === "left"
                      ? "start"
                      : l.textAlign === "right"
                        ? "end"
                        : "middle"
                  }
                  fontFamily={fontFamily(l)}
                  letterSpacing={
                    l.customFont || l.garminFont?.startsWith("chalk")
                      ? 0
                      : l.kind === "time"
                        ? -4
                        : 0
                  }
                  fontSize={aod ? l.aodSize || l.size : l.size}
                  fontWeight={
                    l.customFont || l.garminFont?.startsWith("chalk")
                      ? 400
                      : l.fontWeight || (l.kind === "time" ? 600 : 400)
                  }
                  opacity={l.opacity ?? 1}
                  fill={aod ? l.aodColor || "#777777" : ink(l, preview)}
                >
                  {l.kind === "metric" && l.metricDecoration !== false
                    ? metricDecorations[l.source] || ""
                    : ""}
                  {reading(l, aod ? { ...preview, seconds: 0 } : preview)}
                </text>
              )}
              {selection.includes(l.id) && (
                <>
                  <rect
                    width={l.w}
                    height={l.h}
                    fill="none"
                    stroke="#45d6be"
                    strokeWidth="1"
                  />
                  {selected === l.id &&
                    [
                      [0, 0],
                      [l.w, 0],
                      [0, l.h],
                      [l.w, l.h],
                    ].map(([x, y], i) => (
                      <rect
                        key={i}
                        x={x - 3}
                        y={y - 3}
                        width="6"
                        height="6"
                        fill="#e7fff9"
                        stroke="#45d6be"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onDown?.(e, owners.get(l.id)||sourceLayers.get(l.id)||l, i);
                        }}
                        aria-label={
                          ["左上缩放", "右上缩放", "左下缩放", "右下缩放"][i]
                        }
                        style={{
                          cursor: l.locked
                            ? "not-allowed"
                            : i === 0 || i === 3
                              ? "nwse-resize"
                              : "nesw-resize",
                        }}
                      />
                    ))}
                </>
              )}
            </g>
          ))}
      </g>
      {selectionBox && (
        <rect
          x={selectionBox.x}
          y={selectionBox.y}
          width={selectionBox.w}
          height={selectionBox.h}
          fill="#45d6be22"
          stroke="#45d6be"
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
