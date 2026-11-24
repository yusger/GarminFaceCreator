export function formatMetricValue(
  source: string,
  value: number,
  precision?: number,
) {
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
