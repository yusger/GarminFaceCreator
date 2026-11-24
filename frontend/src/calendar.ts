export const DEFAULT_CALENDAR_DATE = "2026-11-23"; // Editor demo; live preview supplies local device/browser date.
export const calendarWeekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseDate(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw Error("日历日期无效");
  const [y, m, d] = key.split("-").map(Number),
    date = new Date(Date.UTC(y, m - 1, d));
  if (
    y < 100 ||
    y > 9999 ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    throw Error("日历日期无效");
  return date;
}
export function shiftCalendarDate(key: string, offset: number) {
  const date = parseDate(key);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function calendarDateLabel(key: string) {
  const date = parseDate(key);
  return (
    ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getUTCDay()] +
    " " +
    date.getUTCDate()
  );
}
export function calendarGrid(
  key: string,
  start: "monday" | "sunday" = "monday",
) {
  const today = parseDate(key),
    first = start === "monday" ? 1 : 0,
    month = today.getUTCMonth();
  const offset = -7 - ((today.getUTCDay() - first + 7) % 7);
  const cells = Array.from({ length: 21 }, (_, i) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset + i);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      adjacent: date.getUTCMonth() !== month,
      today: i === -offset,
    };
  });
  return {
    headers: Array.from(
      { length: 7 },
      (_, i) => calendarWeekdays[(first + i) % 7],
    ),
    cells,
  };
}
