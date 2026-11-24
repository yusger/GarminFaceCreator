import type { Box } from "./selection";
import { thresholdInk } from "./thresholds";
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
  if (l.kind === "metric") {
    const values: Record<string, number> = {
      heartRate: d.heartRate,
      steps: d.steps,
      battery: d.battery,
      calories: 426,
      distance: 6.42,
      temperature: 24,
      stress: 30,
      recoveryHours: 5,
      floorsClimbed: 0,
      intensityMinutes: 0,
      humidity: 62,
      uvIndex: 3,
      altitude: -59,
      windSpeed: 6,
      seconds: d.seconds,
    };
    const units: Record<string, string> = {
      battery: "%",
      temperature: "°C",
      recoveryHours: "h",
      intensityMinutes: "/150",
      humidity: "%",
      altitude: "ft",
      windSpeed: "m",
    };
    const value = values[l.source];
    const prefix = l.label ? l.label + " " : "";
    if (d.missing || !Number.isFinite(value))
      return prefix + (l.missingValue ?? "--");
    const text =
      l.precision !== undefined
        ? value.toFixed(l.precision)
        : l.source === "steps"
          ? value.toLocaleString()
          : l.source === "seconds"
            ? String(value).padStart(2, "0")
            : String(value);
    return prefix + text + (l.unit ?? units[l.source] ?? "");
  }
  return "";
}
export function ink(l: Layer, d: Preview) {
  return thresholdInk(
    l,
    l.source === "heartRate"
      ? d.heartRate
      : l.source === "battery"
        ? d.battery
        : undefined,
    !!d.missing,
  );
}
export function ringLit(l: Layer, d: Preview, aod = false) {
  if (aod) return 0;
  const source = l.ringSource || "seconds";
  const value =
    source === "static"
      ? 1
      : {
          seconds: d.seconds,
          steps: d.steps,
          battery: d.battery,
          heartRate: d.heartRate,
        }[source];
  const goal =
    source === "static"
      ? 1
      : l.ringGoal ||
        (source === "seconds"
          ? 60
          : source === "steps"
            ? 10000
            : source === "battery"
              ? 100
              : 180);
  return Math.floor(
    (l.ringTicks || 60) *
      Math.max(0, Math.min(1, Number.isFinite(value) ? value / goal : 0)),
  );
}
export default function Scene({
  project,
  preview,
  aod = false,
  selected = "",
  selection = [selected],
  selectionBox,
  exact = false,
  onDown,
}: {
  project: Project;
  preview: Preview;
  aod?: boolean;
  selected?: string;
  selection?: string[];
  selectionBox?: Box | null;
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
          .filter(
            (l) =>
              (exact ? l.exportIncluded !== false : !l.hidden) &&
              (!aod ||
                (l.aod &&
                  !(
                    l.aodSeconds === "hide" &&
                    ((l.kind === "metric" && l.source === "seconds") ||
                      l.kind === "ring")
                  ))),
          )
          .map((l) => (
            <g
              key={l.id}
              data-layer={l.id}
              data-guide={l.guide ? "true" : undefined}
              transform={`translate(${l.x} ${l.y}) rotate(${l.rotation} ${l.w / 2} ${l.h / 2})`}
              onPointerDown={(e) => onDown?.(e, l)}
              style={{
                cursor: l.locked ? "not-allowed" : onDown ? "move" : "default",
              }}
            >
              {l.kind === "ring" ? (
                Array.from({ length: l.ringTicks || 60 }, (_, i) => {
                  const count = l.ringTicks || 60,
                    start = l.ringStart ?? 0,
                    end = l.ringEnd ?? 360;
                  const a =
                    ((start +
                      (i * (end - start)) /
                        (Math.abs(end - start) === 360
                          ? count
                          : Math.max(1, count - 1))) *
                      Math.PI) /
                    180;
                  return (
                    <line
                      key={i}
                      x1={l.w / 2 + Math.sin(a) * (l.w / 2 - 9)}
                      y1={l.h / 2 - Math.cos(a) * (l.h / 2 - 9)}
                      x2={l.w / 2 + (Math.sin(a) * l.w) / 2}
                      y2={l.h / 2 - (Math.cos(a) * l.h) / 2}
                      stroke={aod ? l.aodColor || "#777777" : l.color}
                      strokeWidth={
                        (l.ringWidth || 2) *
                        (i %
                          Math.max(1, Math.round((l.ringTicks || 60) / 12)) ===
                        0
                          ? 1.5
                          : 1)
                      }
                      opacity={
                        i < ringLit(l, preview, aod) ? 1 : (l.ringDim ?? 0.25)
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
                <rect
                  width={l.w}
                  height={l.h}
                  fill={
                    l.fillEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.color
                  }
                  rx={l.cornerRadius ?? 4}
                  fillOpacity={l.opacity ?? 1}
                  stroke={
                    l.strokeEnabled
                      ? aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                      : "none"
                  }
                  strokeWidth={l.strokeWidth || 2}
                  strokeOpacity={l.opacity ?? 1}
                />
              ) : l.kind === "circle" ? (
                <ellipse
                  cx={l.w / 2}
                  cy={l.h / 2}
                  rx={l.w / 2}
                  ry={l.h / 2}
                  fill={
                    l.fillEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.color
                  }
                  fillOpacity={l.opacity ?? 1}
                  stroke={
                    l.strokeEnabled
                      ? aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                      : "none"
                  }
                  strokeWidth={l.strokeWidth || 2}
                  strokeOpacity={l.opacity ?? 1}
                />
              ) : l.kind === "line" ? (
                <line
                  x1="0"
                  y1="0"
                  x2={l.w}
                  y2={l.h}
                  stroke={
                    l.strokeEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                  }
                  strokeWidth={l.strokeWidth || 2}
                  strokeOpacity={l.opacity ?? 1}
                  strokeDasharray={l.guide ? "6 4" : undefined}
                  strokeLinecap={(l.strokeWidth || 2) > 2 ? "round" : "butt"}
                />
              ) : (
                <text
                  x={
                    l.textAlign === "left"
                      ? 0
                      : l.textAlign === "right"
                        ? l.w
                        : l.w / 2
                  }
                  y={l.h / 2}
                  dominantBaseline="central"
                  textAnchor={
                    l.textAlign === "left"
                      ? "start"
                      : l.textAlign === "right"
                        ? "end"
                        : "middle"
                  }
                  fontFamily="Arial, sans-serif"
                  letterSpacing={l.kind === "time" ? -4 : 0}
                  fontSize={aod ? l.aodSize || l.size : l.size}
                  fontWeight={l.fontWeight || (l.kind === "time" ? 600 : 400)}
                  fill={aod ? l.aodColor || "#777777" : ink(l, preview)}
                >
                  {l.kind === "metric" && l.source === "heartRate" ? "♡ " : ""}
                  {reading(l, aod ? { ...preview, seconds: 0 } : preview)}
                </text>
              )}
              {selection.includes(l.id) && (
                <>
                  <rect
                    width={l.w}
                    height={l.h}
                    fill="none"
                    stroke="#45d6be"
                    strokeWidth="1"
                  />
                  {selected === l.id &&
                    [
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
      {selectionBox && (
        <rect
          x={selectionBox.x}
          y={selectionBox.y}
          width={selectionBox.w}
          height={selectionBox.h}
          fill="#45d6be22"
          stroke="#45d6be"
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
