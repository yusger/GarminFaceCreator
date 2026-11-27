// Pure preview data semantics shared by rendering, export and offline validation.
import type { Layer } from "./domain.ts";
import { timeText, timeInOffset } from "./timeParts.ts";
import {
  metricDisplayUnits,
  formatMetricValue,
  validMetricValue,
} from "./metricFormat.ts";
import { thresholdInk } from "./thresholds.ts";
import { ringProgress } from "./arc.ts";
export type Preview = {
  chartCase?:import("./charts").ChartPreviewCase;
  values?: Record<string, number | null>;
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
    oxygenSaturation:98,
    phoneConnected:1,
    moveBarLevel:2,
    precipitationChance:29,
    windBearing:270,
    sunrise:/^([01]\d|2[0-3]):[0-5]\d$/.test(d.sunrise||"06:25")?Number((d.sunrise||"06:25").slice(0,2))*3600+Number((d.sunrise||"06:25").slice(3))*60:NaN,
    sunset:/^([01]\d|2[0-3]):[0-5]\d$/.test(d.sunset||"18:01")?Number((d.sunset||"18:01").slice(0,2))*3600+Number((d.sunset||"18:01").slice(3))*60:NaN,
    seconds: d.seconds,
    ...Object.fromEntries(
      Object.entries(d.values || {}).map(([key, value]) => [key, value ?? NaN]),
    ),
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
    if(l.dateFormat==="weekdayDay"){
      const date=new Date((d.calendarDate||"2026-11-23")+"T12:00:00");return Number.isFinite(date.getTime())?["SUN","MON","TUE","WED","THU","FRI","SAT"][date.getDay()]+" "+String(date.getDate()).padStart(2,"0"):"--";
    }
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
  if (!["metric","meter"].includes(l.kind) || !l.threshold) return l.color;
  return thresholdInk(
    l,
    metricValues(d)[l.source],
    !!d.missing || !validMetricValue(l.source, metricValues(d)[l.source]),
  );
}

export function ringLit(l: Layer, d: Preview, aod = false) {
  return Math.floor(
    (l.ringTicks || 60) *
      ringProgress(
        l,
        l.ringSource === "seconds" || !l.ringSource
          ? d.seconds
          : metricValues(d)[l.ringSource!],
        !!d.missing,
        aod,
      ),
  );
}
