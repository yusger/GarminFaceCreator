// Geocentric illumination equations adapted from SunCalc 1.9.0 (BSD-2-Clause).
// Copyright (c) 2014, Vladimir Agafonkin. Full terms: resources/licenses/suncalc-1.9.0-LICENSE.txt.
export type MoonSample = { phase: number; illumination: number };
export const MOON_MODEL_VERSION = "suncalc-1.9-illumination-1";
export const MOON_START = Date.UTC(2000, 0, 1) / 1000,
  MOON_END = Date.UTC(2038, 0, 1) / 1000;
// UTC instant, no observer position. Display is a diagram, not local sky orientation.
export function moonAt(seconds: number): MoonSample | null {
  if (!Number.isFinite(seconds) || seconds < MOON_START || seconds >= MOON_END)
    return null;
  const { sin, cos, tan, asin, acos, atan2, PI } = Math,
    rad = PI / 180,
    days = seconds / 86400 - 10957.5,
    obliquity = 23.4397 * rad;
  const ra = (lon: number, lat: number) =>
      atan2(sin(lon) * cos(obliquity) - tan(lat) * sin(obliquity), cos(lon)),
    dec = (lon: number, lat: number) =>
      asin(sin(lat) * cos(obliquity) + cos(lat) * sin(obliquity) * sin(lon));
  const solarAnomaly = rad * (357.5291 + 0.98560028 * days),
    solarLon =
      solarAnomaly +
      rad *
        (1.9148 * sin(solarAnomaly) +
          0.02 * sin(2 * solarAnomaly) +
          0.0003 * sin(3 * solarAnomaly) +
          102.9372) +
      PI;
  const meanLon = rad * (218.316 + 13.176396 * days),
    moonAnomaly = rad * (134.963 + 13.064993 * days),
    argument = rad * (93.272 + 13.22935 * days),
    moonLon = meanLon + rad * 6.289 * sin(moonAnomaly),
    moonLat = rad * 5.128 * sin(argument),
    distance = 385001 - 20905 * cos(moonAnomaly);
  const sd = dec(solarLon, 0),
    sr = ra(solarLon, 0),
    md = dec(moonLon, moonLat),
    mr = ra(moonLon, moonLat),
    separation = acos(
      Math.max(
        -1,
        Math.min(1, sin(sd) * sin(md) + cos(sd) * cos(md) * cos(sr - mr)),
      ),
    ),
    incidence = atan2(
      149598000 * sin(separation),
      distance - 149598000 * cos(separation),
    ),
    angle = atan2(
      cos(sd) * sin(sr - mr),
      sin(sd) * cos(md) - cos(sd) * sin(md) * cos(sr - mr),
    );
  return {
    phase: 0.5 + (0.5 * incidence * (angle < 0 ? -1 : 1)) / PI,
    illumination: (1 + cos(incidence)) / 2,
  };
}
const previewCache = new Map<number, MoonSample | null>();
export function previewMoon(d: {
  calendarDate?: string;
  time: string;
  seconds: number;
  utcOffsetMinutes?: number;
  missing?: boolean;
}) {
  if (
    d.missing ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.calendarDate || "") ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time) ||
    !Number.isFinite(d.seconds) ||
    d.seconds < 0 ||
    d.seconds > 59
  )
    return null;
  const base = Date.parse(d.calendarDate + "T" + d.time + ":00Z");
  if (
    !Number.isFinite(base) ||
    new Date(base).toISOString().slice(0, 10) !== d.calendarDate
  )
    return null;
  const offset =
    d.utcOffsetMinutes ??
    -new Date(d.calendarDate + "T" + d.time + ":00").getTimezoneOffset();
  if (!Number.isInteger(offset) || Math.abs(offset) > 840) return null;
  const instant = base / 1000 + d.seconds - offset * 60;
  if (!Number.isFinite(instant)) return null;
  const anchor = Math.floor(instant / 600) * 600;
  if (!previewCache.has(anchor)) {
    previewCache.set(anchor, moonAt(anchor));
    while (previewCache.size > 4)
      previewCache.delete(previewCache.keys().next().value!);
  }
  return previewCache.get(anchor)!;
}
// <=50 points: two half-ellipse boundaries. South is a diagrammatic horizontal mirror.
export function moonContour(phase: number, south = false) {
  const points: [number, number][] = [];
  const waxing = phase < 0.5,
    mirror = (waxing ? 1 : -1) * (south ? -1 : 1),
    k = Math.cos(2 * Math.PI * phase);
  for (let i = 0; i <= 24; i++) {
    const t = -Math.PI / 2 + (i * Math.PI) / 24;
    points.push([mirror * Math.cos(t), Math.sin(t)]);
  }
  for (let i = 24; i >= 0; i--) {
    const t = -Math.PI / 2 + (i * Math.PI) / 24;
    points.push([mirror * k * Math.cos(t), Math.sin(t)]);
  }
  return points;
}

// Physical pixel centers. A subpixel crescent must not turn into an opaque polygon edge.
export function moonPixelSpans(
  phase: number,
  south: boolean,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (
    ![phase, x, y, w, h].every(Number.isFinite) ||
    ![x, y, w, h].every(Number.isInteger) ||
    w < 1 ||
    h < 1 ||
    w > 128 ||
    h > 128
  )
    throw Error("Moon raster budget");
  const r = Math.min(w, h) * 0.45,
    cx = x + w / 2,
    cy = y + h / 2,
    k = Math.cos(2 * Math.PI * phase),
    waxing = phase < 0.5,
    rows: { x: number; y: number; width: number }[] = [];
  for (let py = Math.ceil(cy - r - 0.5); py <= Math.floor(cy + r - 0.5); py++) {
    const dy = py + 0.5 - cy,
      e = Math.sqrt(Math.max(0, r * r - dy * dy));
    let left = waxing ? k * e : -e,
      right = waxing ? e : -k * e;
    if (south) [left, right] = [-right, -left];
    const start = Math.ceil(cx + left - 0.5),
      end = Math.floor(cx + right - 0.5);
    if (end >= start) rows.push({ x: start, y: py, width: end - start + 1 });
  }
  return rows;
}
