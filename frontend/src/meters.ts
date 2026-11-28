import {validMetricValue} from "./metricFormat.ts";
export const meterSources=["steps","battery","oxygenSaturation","moveBarLevel"];
export const meterDefaultGoal=(source:string)=>source==="moveBarLevel"?5:source==="steps"?10000:100;
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
    value == null || !validMetricValue(l.source,value)
  )
    return 0;
  return Math.floor(
    (l.meterCount ?? 16) *
      Math.max(
        0,
        Math.min(
          1,
          value / (l.meterGoal ?? meterDefaultGoal(l.source)),
        ),
      ),
  );
}


// Integer coverage of bar segments at target pixel centres; right/bottom are exclusive.
// fillPolygon includes boundary pixels on SDK9.3, which can close narrow designed gaps.
export function meterRasterRects(l:Layer,scale:number){
 if((l.meterShape||"bar")!=="bar"||!Number.isFinite(scale)||scale<=0)throw Error("矩形分段需要条形进度和有效像素比例");
 return meterPolygons(l).map(points=>{
  const x=Math.ceil((l.x+points[0][0])*scale-.5),y=Math.ceil(l.y*scale-.5),right=Math.ceil((l.x+points[1][0])*scale-.5),bottom=Math.ceil((l.y+l.h)*scale-.5);
  return {x,y,w:Math.max(0,right-x),h:Math.max(0,bottom-y)};
 });
}
