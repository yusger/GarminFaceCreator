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
  const selected = { top: 0, middle: 1, bottom: 2 }[l.wordRow as "top"];
  return (
    <g data-word-language={l.wordLanguage || "en"}>
      {rows.map((text, i) =>
        selected !== undefined && selected !== i ? null : (
          <text
            key={i}
            data-word-line={i}
            x={
              l.textAlign === "left"
                ? 0
                : l.textAlign === "right"
                  ? l.w
                  : l.w / 2
            }
            y={selected === undefined ? ((i + 0.5) * l.h) / 3 : l.h / 2}
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
        ),
      )}
    </g>
  );
}
