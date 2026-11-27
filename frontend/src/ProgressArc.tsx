import type { Layer } from "./domain";
import { arcBands, arcCaps } from "./arc";
export default function ProgressArc({
  layer: l,
  progress,
  aod,
}: {
  layer: Layer;
  progress: number;
  aod: boolean;
}) {
  const start = l.ringStart ?? 0,
    end = l.ringEnd ?? 360,
    width = l.ringWidth || 2,
    color = aod ? l.aodColor || "#777777" : l.color;
  const band = (finish: number, opacity: number, key: string) => (
    <g key={key} opacity={opacity} fill={color}>
      {arcBands(l.w, l.h, start, finish, width).map((points, i) => (
        <polygon key={i} points={points.map((p) => p.join(",")).join(" ")} />
      ))}
      {l.ringCap === "round" &&
        Math.abs(finish - start) > 0.000001 &&
        Math.abs(finish - start) < 360 &&
        arcCaps(l.w, l.h, start, finish, width).map((c, i) => (
          <circle key={"cap" + i} cx={c.x} cy={c.y} r={c.r} />
        ))}
    </g>
  );
  return (
    <g data-progress-arc>
      {band(end, l.ringDim ?? 0.25, "track")}
      {progress > 0 && band(start + (end - start) * progress, 1, "progress")}
    </g>
  );
}
