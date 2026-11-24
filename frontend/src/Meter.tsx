import type { Layer } from "./domain";
import { meterLit, meterPolygons } from "./meters";
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
