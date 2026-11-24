import type { Layer } from "./domain";
import { wordTimeLines } from "./wordTime";
export default function WordTimeWidget({
  layer: l,
  time,
  seconds,
  aod = false,
}: {
  layer: Layer;
  time: string;
  seconds: number;
  aod?: boolean;
}) {
  const [hour, minute] = time.split(":").map(Number);
  const rows = wordTimeLines(hour, minute, aod ? 0 : seconds, l.wordLanguage);
  return (
    <g data-word-language={l.wordLanguage || "en"}>
      {rows.map((text, i) => (
        <text
          key={i}
          data-word-line={i}
          x={
            l.textAlign === "left" ? 0 : l.textAlign === "right" ? l.w : l.w / 2
          }
          y={((i + 0.5) * l.h) / 3}
          textAnchor={
            l.textAlign === "left"
              ? "start"
              : l.textAlign === "right"
                ? "end"
                : "middle"
          }
          dominantBaseline="central"
          fill={aod ? l.aodColor || "#777777" : l.color}
          fontSize={aod ? l.aodSize || l.size : l.size}
          fontWeight={l.fontWeight || 400}
        >
          {text}
        </text>
      ))}
    </g>
  );
}
