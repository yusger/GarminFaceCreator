import type { Layer } from "./domain";
export function timeText(
  time: string,
  part: Layer["timePart"] = "full",
  seconds = 0,
) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "--";
  const [h, m] = time.split(":");
  const values = {
    full: time,
    seconds: String(Math.max(0, Math.min(59, seconds))).padStart(2, "0"),
    hours: h,
    minutes: m,
    hourTens: h[0],
    hourOnes: h[1],
    minuteTens: m[0],
    minuteOnes: m[1],
  };
  return values[part] ?? "--";
}
export function nativeTimeText(
  part: Layer["timePart"] = "full",
  clock = "clock",
) {
  const values: Record<NonNullable<Layer["timePart"]>, string> = {
    seconds: 'clock.sec.format("%02d")',
    full: 'clock.hour.format("%02d")+":"+clock.min.format("%02d")',
    hours: 'clock.hour.format("%02d")',
    minutes: 'clock.min.format("%02d")',
    hourTens: '(clock.hour/10).toNumber().format("%d")',
    hourOnes: '(clock.hour%10).format("%d")',
    minuteTens: '(clock.min/10).toNumber().format("%d")',
    minuteOnes: '(clock.min%10).format("%d")',
  };
  const result = values[part];
  if (!result) throw Error("时间部分无效");
  return result.replaceAll("clock.", clock + ".");
}

// Signed minutes east of UTC; undefined keeps device local time. This does not implement IANA/DST rules.
export function timeInOffset(
  time: string,
  target?: number,
  local = -new Date().getTimezoneOffset(),
) {
  if (target === undefined) return time;
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !Number.isInteger(target) ||
    target < -720 ||
    target > 840 ||
    !Number.isFinite(local)
  )
    return "--";
  const [h, m] = time.split(":").map(Number),
    total = (((h * 60 + m - local + target) % 1440) + 1440) % 1440;
  return (
    String(Math.floor(total / 60)).padStart(2, "0") +
    ":" +
    String(total % 60).padStart(2, "0")
  );
}
export function nativeClock(offset?: number) {
  if (
    offset !== undefined &&
    (!Number.isInteger(offset) || offset < -720 || offset > 840)
  )
    throw Error("固定 UTC 偏移无效");
  return offset === undefined
    ? "clock"
    : "zone" + (offset < 0 ? "m" : "p") + Math.abs(offset);
}
