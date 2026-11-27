import type { Layer } from "./domain";
import { arcBands, arcCaps, circleArcPath } from "./arc";
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
  if (l.w === l.h) {
    const path = (finish: number, opacity: number, key: string) => (
      <path
        key={key}
        d={circleArcPath(l.w, l.h, start, finish, width)}
        fill="none"
        stroke={color}
        strokeWidth={Math.min(width, l.w / 2)}
        strokeLinecap={l.ringCap === "round" ? "round" : "butt"}
        opacity={opacity}
      />
    );
    return (
      <g data-progress-arc>
        {path(end, l.ringDim ?? 0.25, "track")}
        {progress > 0 && path(start + (end - start) * progress, 1, "progress")}
      </g>
    );
  }
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
