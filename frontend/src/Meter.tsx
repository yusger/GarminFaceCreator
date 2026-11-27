import {validMetricValue} from "./metricFormat.ts";
import {meterDefaultGoal} from "./meters.ts";
import type { Layer } from "./domain";
import { meterLit, meterPolygons } from "./meters.ts";
export default function Meter({
  layer: l,
  value,
  missing = false,
  aod = false,
}: {
  layer: Layer;
  value?: number;
  missing?: boolean;
  aod?: boolean;
}) {
  if (l.meterContinuous) {
    const valid =
        !missing &&
        validMetricValue(l.source,value),
      ratio = valid
        ? Math.max(0, Math.min(1, value! / (l.meterGoal ?? meterDefaultGoal(l.source))))
        : 0;
    return (
      <>
        <rect
          width={l.w}
          height={l.h}
          fill={aod ? l.aodColor || "#777777" : l.meterDimColor || "#16324a"}
        />
        <rect
          data-continuous-fill="true"
          width={l.w * ratio}
          height={l.h}
          fill={aod ? l.aodColor || "#777777" : l.color}
        />
      </>
    );
  }
  const lit = meterLit(l, value, missing);
  return (
    <>
      {meterPolygons(l).map((points, i) => (
        <polygon
          key={i}
          data-meter-segment={i}
          data-lit={i < lit ? "true" : "false"}
          points={points.map((p) => p.join(",")).join(" ")}
          fill={aod ? l.aodColor || "#777777" : l.color}
          opacity={i < lit ? 1 : (l.meterDim ?? 0.35)}
        />
      ))}
    </>
  );
}
