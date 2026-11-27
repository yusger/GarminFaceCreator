import type { Layer } from "./domain";
import { metricDisplayUnits, metricDecorations } from "./metricFormat";
export const readoutSamples: Record<string, string> = {
  heartRate: "199",
  steps: "99,999",
  battery: "100",
  calories: "9999",
  distance: "999.99",
  temperature: "-99.9",
  seconds: "59",
  stress: "100",
  recoveryHours: "999",
  floorsClimbed: "999",
  intensityMinutes: "999",
  humidity: "100",
  uvIndex: "99",
  altitude: "-99,999",
  windSpeed: "99.9",
};
export function readoutCheckText(l: Layer) {
  return (
    (l.metricDecoration !== false ? metricDecorations[l.source] || "" : "") +
    (l.label ? l.label + " " : "") +
    (l.readoutSample || readoutSamples[l.source] || "99999") +
    (l.unit ?? metricDisplayUnits[l.source] ?? "")
  );
}
export function readoutWidthCheck(l: Layer, measure: (text: string) => number) {
  const text = readoutCheckText(l),
    width = measure(text);
  return { text, width, available: l.w, overflow: width > l.w };
}
