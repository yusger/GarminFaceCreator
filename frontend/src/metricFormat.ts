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
