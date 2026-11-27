import type { Layer } from "./domain";
import { curvedLayout } from "./curvedTextLayout";
export default function CurvedText({
  layer: l,
  aod,
}: {
  layer: Layer;
  aod: boolean;
}) {
  const size = aod ? l.aodSize || l.size : l.size,
    chars = [...l.text],
    ctx =
      typeof document !== "undefined"
        ? document.createElement("canvas").getContext("2d")
        : null;
  if (ctx) ctx.font = `400 ${size}px Arial, sans-serif`;
  const widths = chars.map((c) => ctx?.measureText(c).width ?? size * 0.65),
    positions = curvedLayout(l, widths);
  return (
    <g data-curved-text>
      {chars.map((c, i) => (
        <text
          key={i}
          x={positions[i].x}
          y={positions[i].y}
          transform={`rotate(${positions[i].rotation} ${positions[i].x} ${positions[i].y})`}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize={size}
          fontWeight={400}
          fill={aod ? l.aodColor || "#777777" : l.color}
        >
          {c}
        </text>
      ))}
    </g>
  );
}
