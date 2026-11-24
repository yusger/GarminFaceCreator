import type { Layer } from "./domain";
export function timeText(time: string, part: Layer["timePart"] = "full") {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "--";
  const [h, m] = time.split(":");
  const values = {
    full: time,
    hours: h,
    minutes: m,
    hourTens: h[0],
    hourOnes: h[1],
    minuteTens: m[0],
    minuteOnes: m[1],
  };
  return values[part] ?? "--";
}
export function nativeTimeText(part: Layer["timePart"] = "full") {
  const values: Record<NonNullable<Layer["timePart"]>, string> = {
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
  return result;
}
