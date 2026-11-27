import type { Layer } from "./domain";
import type { Preview } from "./previewData";
import { moonContour, previewMoon, moonPixelSpans } from "./moon";
export default function MoonIcon({
  layer: l,
  preview,
  aod = false,
  pixelScale = 1,
}: {
  layer: Layer;
  preview: Preview;
  aod?: boolean;
  pixelScale?: number;
}) {
  const m = previewMoon(preview),
    box = {
      x: Math.trunc(l.x * pixelScale),
      y: Math.trunc(l.y * pixelScale),
      w: Math.trunc(l.w * pixelScale),
      h: Math.trunc(l.h * pixelScale),
    },
    r = (Math.min(box.w, box.h) * 0.45) / pixelScale,
    cx = (box.x + box.w / 2) / pixelScale - l.x,
    cy = (box.y + box.h / 2) / pixelScale - l.y,
    ink = aod ? l.aodColor || "#777777" : l.color,
    points = m ? moonContour(m.phase, l.moonHemisphere === "south") : [],
    terminator = points.slice(25);
  if (box.w < 1 || box.h < 1 || box.w > 128 || box.h > 128)
    return (
      <g data-moon-unavailable="size">
        <rect width={l.w} height={l.h} fill="none" stroke="#ff7766" />
        <title>月相像素尺寸超限，请调整到128px以内</title>
      </g>
    );
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
        strokeWidth={1 / pixelScale}
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
          strokeWidth={1 / pixelScale}
          fill="none"
        />
      ) : aod && m.illumination <= 0.005 ? null : aod ? (
        <polyline
          points={terminator
            .map(([x, y]) => `${cx + x * r},${cy + y * r}`)
            .join(" ")}
          stroke={ink}
          strokeWidth={1 / pixelScale}
          fill="none"
        />
      ) : (
        <g shapeRendering="crispEdges" fill={ink}>
          {moonPixelSpans(
            m.phase,
            l.moonHemisphere === "south",
            box.x,
            box.y,
            box.w,
            box.h,
          ).map((row) => (
            <rect
              key={row.y}
              x={row.x / pixelScale - l.x}
              y={row.y / pixelScale - l.y}
              width={row.width / pixelScale}
              height={1 / pixelScale}
            />
          ))}
        </g>
      )}
    </g>
  );
}
