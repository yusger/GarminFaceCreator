import type { Project } from "./domain";
import type { Preview } from "./Scene";
import { expandWidgets } from "./compound";
import { resolveControls } from "./projectControls";
import { defaultThresholds } from "./thresholds";
export function withPreviewValues(
  p: Preview,
  values: Record<string, number | null>,
): Preview {
  const next = { ...p, missing: false, values: { ...p.values } };
  for (const [source, value] of Object.entries(values))
    if (["heartRate", "steps", "battery", "seconds"].includes(source))
      (next as any)[source] = value ?? NaN;
    else next.values[source] = value;
  return next;
}
export function previewStress(
  p: Preview,
  mode: "long" | "short" | "negative",
): Preview {
  const values: Record<string, number | null> =
    mode === "long"
      ? {
          heartRate: 199,
          steps: 999999,
          battery: 100,
          seconds: 59,
          calories: 99999,
          distance: 999.99,
          temperature: 39.9,
          stress: 100,
          recoveryHours: 999,
          floorsClimbed: 999,
          intensityMinutes: 999,
          humidity: 100,
          uvIndex: 11,
          altitude: -9999,
          windSpeed: 99.9,
        }
      : mode === "short"
        ? {
            heartRate: 50,
            steps: 0,
            battery: 0,
            seconds: 0,
            calories: 0,
            distance: 0,
            temperature: 0,
            stress: 0,
            recoveryHours: 0,
            floorsClimbed: 0,
            intensityMinutes: 0,
            humidity: 0,
            uvIndex: 0,
            altitude: 0,
            windSpeed: 0,
          }
        : { temperature: -19.9, altitude: -999.9 };
  return withPreviewValues(
    {
      ...p,
      ...(mode === "long"
        ? { time: "23:58", calendarDate: "2026-09-30", date: "WED 30" }
        : {}),
    },
    values,
  );
}
export function previewBoundaries(p: Project) {
  const all = expandWidgets(resolveControls(p)).layers;
  const result = new Map<string, { source: string; value: number }>();
  const add = (source: string, value: number, step: number) => {
    if (!Number.isFinite(value)) return;
    for (const offset of [-step, 0, step]) {
      const v = Number((value + offset).toFixed(6));
      result.set(source + ":" + v, { source, value: v });
    }
  };
  for (const l of all) {
    if (l.kind === "metric" && l.threshold)
      for (const r of l.thresholdRules ?? defaultThresholds(l.source, l.color))
        for (const v of [r.min, r.max])
          if (v !== undefined) add(l.source, v, 10 ** -(l.precision ?? 0));
    if (l.visibility)
      for (const v of [l.visibility.min, l.visibility.max])
        if (v !== undefined) add(l.visibility.source, v, 1);
    if (l.kind === "meter") {
      add(l.source, 0, 1);
      add(l.source, l.meterGoal ?? (l.source === "battery" ? 100 : 10000), 1);
    }
  }
  return [...result.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.value - b.value,
  );
}
