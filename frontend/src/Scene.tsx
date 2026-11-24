import { useId } from "react";
import type { Project, Layer } from "./domain";
export type Preview = {
  missing?: boolean;
  date?: string;
  time: string;
  heartRate: number;
  steps: number;
  battery: number;
  seconds: number;
};
export function reading(l: Layer, d: Preview) {
  if (l.kind === "time") return d.time;
  if (l.kind === "date") return d.date || "MON 23";
  if (l.kind === "text") return l.text;
  if (l.kind === "metric" && d.missing) return "--";
  if (l.kind === "metric")
    return (
      (
        {
          heartRate: String(d.heartRate),
          steps: d.steps.toLocaleString(),
          battery: d.battery + "%",
          calories: "426",
          distance: "6.42",
          temperature: "24°C",
          stress: "30",
          recoveryHours: "5h",
          floorsClimbed: "0",
          intensityMinutes: "0/150",
          humidity: "62%",
          uvIndex: "3",
          altitude: "−59ft",
          windSpeed: "6m",
          seconds: String(d.seconds).padStart(2, "0"),
        } as Record<string, string>
      )[l.source] || "--"
    );
  return "";
}
export function ink(l: Layer, d: Preview) {
  if (d.missing || !l.threshold || l.kind !== "metric") return l.color;
  const v =
    l.source === "heartRate"
      ? d.heartRate
      : l.source === "battery"
        ? d.battery
        : null;
  return v === null
    ? l.color
    : l.source === "heartRate"
      ? v < 120
        ? "#55ff99"
        : v < 150
          ? "#ffee44"
          : "#ff5566"
      : v < 10
        ? "#ff5566"
        : v < 30
          ? "#ffee44"
          : l.color;
}
export default function Scene({
  project,
  preview,
  aod = false,
  selected = "",
  exact = false,
  onDown,
}: {
  project: Project;
  preview: Preview;
  aod?: boolean;
  selected?: string;
  exact?: boolean;
  onDown?: (
    e: React.PointerEvent<SVGGElement>,
    l: Layer,
    resize?: number,
  ) => void;
}) {
  const clipId = useId().replaceAll(":", "");
  return (
    <svg
      className="watch"
      viewBox={exact ? "0 0 454 454" : "-12 -12 478 478"}
      aria-label="表盘画布"
    >
      <defs>
        <clipPath id={"clip-" + clipId}>
          <circle cx="227" cy="227" r="226" />
        </clipPath>
      </defs>
      <circle
        cx="227"
        cy="227"
        r="227"
        fill={aod ? "#000" : "#07131d"}
        stroke="#53616d"
        strokeWidth="0.7"
      />
      <g clipPath={"url(#clip-" + clipId + ")"}>
        {project.layers
          .filter((l) => !l.hidden && (!aod || l.aod))
          .map((l) => (
            <g
              key={l.id}
              data-layer={l.id}
              transform={`translate(${l.x} ${l.y}) rotate(${l.rotation} ${l.w / 2} ${l.h / 2})`}
              onPointerDown={(e) => onDown?.(e, l)}
              style={{
                cursor: l.locked ? "not-allowed" : onDown ? "move" : "default",
              }}
            >
              {l.kind === "ring" ? (
                Array.from({ length: 60 }, (_, i) => {
                  const a = (i * Math.PI) / 30;
                  return (
                    <line
                      key={i}
                      x1={l.w / 2 + Math.sin(a) * (l.w / 2 - 9)}
                      y1={l.h / 2 - Math.cos(a) * (l.h / 2 - 9)}
                      x2={l.w / 2 + (Math.sin(a) * l.w) / 2}
                      y2={l.h / 2 - (Math.cos(a) * l.h) / 2}
                      stroke={l.color}
                      strokeWidth={i % 5 === 0 ? 3 : 2}
                      opacity={
                        i < preview.seconds && preview.seconds > 0 ? 1 : 0.25
                      }
                    />
                  );
                })
              ) : l.kind === "image" ? (
                <image
                  href={l.image}
                  width={l.w}
                  height={l.h}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : l.kind === "rect" ? (
                <rect width={l.w} height={l.h} fill={l.color} rx="4" />
              ) : l.kind === "circle" ? (
                <ellipse
                  cx={l.w / 2}
                  cy={l.h / 2}
                  rx={l.w / 2}
                  ry={l.h / 2}
                  fill={l.color}
                />
              ) : l.kind === "line" ? (
                <line
                  x1="0"
                  y1="0"
                  x2={l.w}
                  y2={l.h}
                  stroke={l.color}
                  strokeWidth={l.strokeWidth || 2}
                  strokeLinecap={(l.strokeWidth || 2) > 2 ? "round" : "butt"}
                />
              ) : (
                <text
                  x={l.w / 2}
                  y={l.h / 2}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  letterSpacing={l.kind === "time" ? -4 : 0}
                  fontSize={l.size}
                  fontWeight={l.kind === "time" ? 600 : 400}
                  fill={aod ? "#777" : ink(l, preview)}
                >
                  {l.kind === "metric" && l.source === "heartRate" ? "♡ " : ""}
                  {reading(l, preview)}
                </text>
              )}
              {selected === l.id && (
                <>
                  <rect
                    width={l.w}
                    height={l.h}
                    fill="none"
                    stroke="#45d6be"
                    strokeWidth="1"
                  />
                  {[
                    [0, 0],
                    [l.w, 0],
                    [0, l.h],
                    [l.w, l.h],
                  ].map(([x, y], i) => (
                    <rect
                      key={i}
                      x={x - 3}
                      y={y - 3}
                      width="6"
                      height="6"
                      fill="#e7fff9"
                      stroke="#45d6be"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onDown?.(e, l, i);
                      }}
                      aria-label={
                        ["左上缩放", "右上缩放", "左下缩放", "右下缩放"][i]
                      }
                      style={{
                        cursor: l.locked
                          ? "not-allowed"
                          : i === 0 || i === 3
                            ? "nwse-resize"
                            : "nesw-resize",
                      }}
                    />
                  ))}
                </>
              )}
            </g>
          ))}
      </g>
    </svg>
  );
}
