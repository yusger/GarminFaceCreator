import type { Layer } from "./domain";
export type SolarState = { state: -1 | 0 | 1; progress: number };
function minutes(s: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return NaN;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}
// Preview samples only: native uses Garmin rise/set Moments and cached device position.
export function solarSample(
  time: string,
  rise = "06:00",
  set = "18:00",
  missing = false,
): SolarState {
  const now = minutes(time),
    start = minutes(rise),
    end = minutes(set);
  if (missing || ![now, start, end].every(Number.isFinite) || end <= start)
    return { state: -1, progress: 0 };
  return now >= start && now < end
    ? { state: 1, progress: (now - start) / (end - start) }
    : { state: 0, progress: 0.5 };
}
export function solarPoint(l: Pick<Layer, "w" | "h">, s: SolarState) {
  const p = Math.max(0, Math.min(1, s.progress));
  return {
    x: l.w * (0.15 + 0.7 * p),
    y: l.h * (0.84 - 0.65 * Math.sin(Math.PI * p)),
    r: Math.min(l.w, l.h) * 0.09,
  };
}

export function solarEventsState(
  now: number,
  rises: number[],
  sets: number[],
): SolarState {
  if (!Number.isFinite(now)) return { state: -1, progress: 0 };
  const before = (xs: number[]) =>
    Math.max(-Infinity, ...xs.filter((x) => Number.isFinite(x) && x <= now));
  const after = (xs: number[]) =>
    Math.min(Infinity, ...xs.filter((x) => Number.isFinite(x) && x > now));
  const rise = before(rises),
    set = before(sets),
    nextRise = after(rises),
    nextSet = after(sets);
  if (rise > set && now - rise < 86400 && nextSet - now < 86400)
    return { state: 1, progress: (now - rise) / (nextSet - rise) };
  if (set > rise && now - set < 86400 && nextRise - now < 86400)
    return { state: 0, progress: 0.5 };
  return { state: -1, progress: 0 };
}
