import type { Layer } from "./domain";
import type { Preview } from "./previewData";
import { moonContour, previewMoon } from "./moon";
export default function MoonIcon({
  layer: l,
  preview,
  aod = false,
}: {
  layer: Layer;
  preview: Preview;
  aod?: boolean;
}) {
  const m = previewMoon(preview),
    r = Math.min(l.w, l.h) * 0.45,
    cx = l.w / 2,
    cy = l.h / 2,
    ink = aod ? l.aodColor || "#777777" : l.color,
    points = m ? moonContour(m.phase, l.moonHemisphere === "south") : [],
    terminator = points.slice(25);
  return (
    <g
      data-moon-phase={m?.phase ?? "missing"}
      aria-label={
        m ? `月相估算，照明${Math.round(m.illumination * 100)}%` : "月相不可用"
      }
    >
      <title>月相估算；南北方向为示意，不代表观测地月面朝向</title>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={aod ? "none" : l.solarNightColor || "#263344"}
        stroke={ink}
        strokeWidth={1}
      />
      {!m ? (
        <line
          x1={cx - r * 0.7}
          y1={cy - r * 0.7}
          x2={cx + r * 0.7}
          y2={cy + r * 0.7}
          stroke={ink}
        />
      ) : aod && m.illumination >= 0.995 ? (
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.55}
          stroke={ink}
          strokeWidth={1}
          fill="none"
        />
      ) : aod && m.illumination <= 0.005 ? null : aod ? (
        <polyline
          points={terminator
            .map(([x, y]) => `${cx + x * r},${cy + y * r}`)
            .join(" ")}
          stroke={ink}
          strokeWidth={1}
          fill="none"
        />
      ) : (
        <polygon
          points={points
            .map(([x, y]) => `${cx + x * r},${cy + y * r}`)
            .join(" ")}
          fill={ink}
          stroke="none"
        />
      )}
    </g>
  );
}
