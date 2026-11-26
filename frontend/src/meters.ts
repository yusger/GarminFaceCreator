import type { Layer } from "./domain";
// Composite geometry in layer-local design units. Index zero fills first.
export function meterPolygons(l: Layer): number[][][] {
  const count = l.meterCount ?? 16;
  if ((l.meterShape || "bar") === "bar") {
    const gap = Math.min(l.meterGap ?? 3, (l.w / count) * 0.25),
      step = l.w / count;
    return Array.from({ length: count }, (_, i) => [
      [i * step + gap / 2, 0],
      [(i + 1) * step - gap / 2, 0],
      [(i + 1) * step - gap / 2, l.h],
      [i * step + gap / 2, l.h],
    ]);
  }
  // An annular strip bounded by radii 227 and 212, spanning y=-160..160.
  const width = 227 - Math.sqrt(212 ** 2 - 160 ** 2),
    step = 320 / count,
    gap = Math.min(3, step * 0.25);
  const x = (radius: number, y: number) =>
    227 - Math.sqrt(radius ** 2 - (y - 160) ** 2);
  return Array.from({ length: count }, (_, i) => {
    const bottom = 320 - i * step - gap / 2,
      top = 320 - (i + 1) * step + gap / 2;
    const ys = Array.from(
      { length: 7 },
      (_, j) => top + ((bottom - top) * j) / 6,
    );
    return [
      ...ys.map((y) => [x(227, y), y]),
      ...[...ys].reverse().map((y) => [x(212, y), y]),
    ].map(([px, py]) => [
      ((l.meterShape === "right" ? width - px : px) * l.w) / width,
      (py * l.h) / 320,
    ]);
  });
}
export function meterLit(
  l: Layer,
  value: number | null | undefined,
  missing = false,
) {
  if (
    missing ||
    value == null ||
    !Number.isFinite(value) ||
    value < 0 ||
    (l.source === "battery" && value > 100)
  )
    return 0;
  return Math.floor(
    (l.meterCount ?? 16) *
      Math.max(
        0,
        Math.min(
          1,
          value / (l.meterGoal ?? (l.source === "battery" ? 100 : 10000)),
        ),
      ),
  );
}
