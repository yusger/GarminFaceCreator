import type { Layer } from "./domain";
import type { Preview } from "./Scene";
import { solarSample, solarPoint } from "./solar";
export default function Celestial({
  layer: l,
  preview: d,
  aod = false,
}: {
  layer: Layer;
  preview: Preview;
  aod?: boolean;
}) {
  const s = solarSample(d.time, d.sunrise, d.sunset, d.missing),
    ink = aod
      ? l.aodColor || "#777777"
      : s.state === 1
        ? l.color
        : s.state === 0
          ? l.solarNightColor ||
            (l.solarPart === "body" ? "#dfedff" : "#0b1829")
          : l.solarMissingColor || "#17212c";
  if (l.solarPart !== "body")
    return (
      <g data-solar-state={s.state}>
        <rect width={l.w} height={l.h} fill={ink} />
        {s.state < 0 && (
          <text
            x={l.w / 2}
            y={l.h / 2}
            dominantBaseline="central"
            textAnchor="middle"
            fill="#9aabbc"
            fontSize={20}
          >
            N/A
          </text>
        )}
      </g>
    );
  if (s.state < 0) return null;
  const { x, y, r } = solarPoint(l, s);
  return (
    <g
      data-solar-state={s.state}
      data-solar-progress={s.progress}
      fill={ink}
      stroke={ink}
      strokeWidth={2}
    >
      <circle cx={x} cy={y} r={r} fill={s.state === 1 ? ink : "none"} />
      {s.state === 1 ? (
        Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * r * 1.25}
              y1={y + Math.sin(a) * r * 1.25}
              x2={x + Math.cos(a) * r * 1.55}
              y2={y + Math.sin(a) * r * 1.55}
            />
          );
        })
      ) : (
        <>
          <circle cx={x + r * 0.25} cy={y - r * 0.2} r={r * 0.13} />
          <circle cx={x - r * 0.3} cy={y + r * 0.2} r={r * 0.18} />
        </>
      )}
    </g>
  );
}
