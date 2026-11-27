export const metricLimits: Record<
  string,
  { min: number; max?: number; exclusiveMin?: boolean }
> = {
  heartRate: { min: 0, exclusiveMin: true },
  battery: { min: 0, max: 100 },
  temperature: { min: -273.15, max: 1000 },
  humidity: { min: 0, max: 100 },
  stress: { min: 0, max: 100 },
  seconds: { min: 0, max: 59 },
  altitude: { min: -1e12 },
};
export function validMetricValue(source: string, value: number | undefined) {
  if (!Number.isFinite(value) || value! <= -1e12 || value! >= 1e12)
    return false;
  const range = metricLimits[source] || { min: 0 };
  return (
    (range.exclusiveMin ? value! > range.min : value! >= range.min) &&
    (range.max === undefined || value! <= range.max)
  );
}
export function nativeMetricValidation() {
  return `function metricValid(value,source){if(value==null || value!=value || value<=-1.0e12 || value>=1.0e12){return false;}${Object.entries(
    metricLimits,
  )
    .map(
      ([source, r]) =>
        `if(source.equals("${source}")){return value${r.exclusiveMin ? ">" : ">="}${r.min === -1e12 ? "-1.0e12" : r.min}${r.max === undefined ? "" : ` && value<=${r.max}`};}`,
    )
    .join("")}return value>=0;}`;
}
export function formatMetricValue(
  source: string,
  value: number,
  precision?: number,
  groupThousands?: boolean,
) {
  if (groupThousands !== undefined)
    return value.toLocaleString("en-US", {
      useGrouping: groupThousands,
      minimumFractionDigits: precision ?? 0,
      maximumFractionDigits: precision ?? 0,
    });
  if (precision !== undefined) return value.toFixed(precision);
  if (source === "steps") return value.toLocaleString("en-US");
  if (source === "seconds") return String(value).padStart(2, "0");
  return Number(value.toFixed(6)).toString();
}
// Display suffixes are presentation; source adapters explicitly convert numeric units.
export const metricDisplayUnits: Record<string, string> = {
  battery: "%",
  temperature: "°C",
  recoveryHours: "h",
  intensityMinutes: "/150",
  humidity: "%",
  altitude: "ft",
  windSpeed: "m/s",
};
export const metricDecorations: Record<string, string> = { heartRate: "♡ " };
