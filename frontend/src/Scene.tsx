import BitmapFontText from "./BitmapFontText";
import ChartWidget from "./ChartWidget";
import {
  metricValues,
  reading,
  ink,
  ringLit,
  type Preview,
} from "./previewData";
export {
  metricValues,
  reading,
  ink,
  ringLit,
  type Preview,
} from "./previewData";
import CurvedText from "./CurvedText";
import ProgressArc from "./ProgressArc";
import { ringProgress } from "./arc";
import { layerTransform } from "./geometry";
import { expandWidgets } from "./compound";
import { resolveControls } from "./projectControls";
import { fontFamily, loadCustomFonts } from "./customFonts";
import { conditionVisible } from "./visibility";
import Hand from "./Hand";
import Celestial from "./Celestial";
import WordTimeWidget from "./WordTimeWidget";
import Calendar from "./CalendarWidget";
import Meter from "./Meter";
import { metricDecorations } from "./metricFormat";
import LibraryImage from "./LibraryImage";
import { guideInsetDesign } from "./layouts";
import type { Box } from "./selection";
import { useId, useEffect } from "react";
import type { Project, Layer } from "./domain";
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
  const sourceLayers = new Map(project.layers.map((l) => [l.id, l]));
  const owners = new Map(
    project.layers
      .filter((l) => l.kind === "widget")
      .flatMap((l) => l.compound!.layers.map((c) => [c.id, l] as const)),
  );
  project = resolveControls(expandWidgets(project, !!onDown));
  const fontKey = JSON.stringify(
    [project.layers.map((l) => l.customFont).filter(Boolean),project.localFonts],
  );
  useEffect(() => {
    void loadCustomFonts(project).catch(() => {});
  }, [fontKey]);
  const clipId = useId().replaceAll(":", "");
  return (
    <svg
      className="watch"
      viewBox={exact ? "0 0 454 454" : "-12 -12 478 478"}
      aria-label="表盘画布"
    >
      <defs>
        <clipPath id={"clip-" + clipId}>
          <circle cx="227" cy="227" r={exact ? 227 : 226} />
        </clipPath>
      </defs>
      <circle
        cx="227"
        cy="227"
        r="227"
        fill={aod ? "#000" : project.backgroundColor || "#000000"}
        stroke={exact ? "none" : "#53616d"}
        strokeWidth={exact ? 0 : 0.7}
      />
      {!exact && project.layoutGuide?.showGuide && (
        <circle
          data-layout-guide="true"
          cx={227}
          cy={227}
          r={227 - guideInsetDesign(project)}
          fill="none"
          stroke="#8096a0"
          strokeDasharray="4 4"
          opacity={0.65}
          pointerEvents="none"
        />
      )}
      <g clipPath={"url(#clip-" + clipId + ")"}>
        {project.layers
          .filter(
            (l) =>
              (exact ? l.exportIncluded !== false : !l.hidden) &&
              (aod || l.activeVisible !== false) &&
              conditionVisible(
                l.visibility,
                preview.missing ? {} : metricValues(preview),
                aod,
              ) &&
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
              data-layer={owners.get(l.id)?.id || l.id}
              data-widget-part={owners.has(l.id) ? l.id : undefined}
              data-guide={l.guide ? "true" : undefined}
              transform={layerTransform(l)}
              onPointerDown={(e) =>
                onDown?.(e, owners.get(l.id) || sourceLayers.get(l.id) || l)
              }
              style={{
                cursor: l.locked ? "not-allowed" : onDown ? "move" : "default",
              }}
            >
              {l.kind === "arcText" ? (
                <CurvedText layer={l} aod={aod} />
              ) : l.kind === "hand" ? (
                <Hand layer={l} preview={preview} aod={aod} />
              ) : l.kind === "celestial" ? (
                <Celestial layer={l} preview={preview} aod={aod} />
              ) : l.kind === "wordTime" ? (
                <WordTimeWidget
                  layer={l}
                  time={preview.time}
                  seconds={preview.seconds}
                  aod={aod}
                />
              ) : l.kind === "calendar" ? (
                <Calendar layer={l} date={preview.calendarDate} aod={aod} />
              ) : l.kind === "meter" ? (
                <Meter
                  layer={l.threshold?{...l,color:ink(l,preview)}:l}
                  value={metricValues(preview)[l.source]}
                  missing={preview.missing}
                  aod={aod}
                />
              ) : l.kind === "ring" && l.ringStyle === "continuous" ? (
                <ProgressArc
                  layer={l}
                  aod={aod}
                  progress={ringProgress(
                    l,
                    l.ringSource === "seconds" || !l.ringSource
                      ? preview.seconds
                      : metricValues(preview)[l.ringSource!],
                    !!preview.missing,
                    aod,
                  )}
                />
              ) : l.kind === "ring" ? (
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
                <LibraryImage
                  layer={aod&&l.iconMask?{...l,color:l.aodColor||"#777777"}:l}
                  condition={preview.weatherCondition}
                  missing={preview.missing}
                />
              ) : l.kind === "chart" ? (<ChartWidget layer={l} preview={preview} aod={aod}/>) : l.kind === "polygon" ? (
                <polygon
                  points={l
                    .polygonPoints!.map(([x, y]) => `${x * l.w},${y * l.h}`)
                    .join(" ")}
                  fill={
                    l.fillEnabled === false
                      ? "none"
                      : aod
                        ? l.aodColor || "#777777"
                        : l.color
                  }
                  stroke={
                    l.strokeEnabled
                      ? aod
                        ? l.aodColor || "#777777"
                        : l.strokeColor || l.color
                      : "none"
                  }
                  strokeWidth={l.strokeWidth || 2}
                  opacity={l.opacity ?? 1}
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
              ) : l.bitmapFontId ? (<BitmapFontText project={project} layer={l} text={(l.kind==="metric"&&l.metricDecoration!==false?metricDecorations[l.source]||"":"")+reading(l,aod?{...preview,seconds:0}:preview)} color={aod?l.aodColor||"#777777":ink(l,preview)}/>) : (
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
                  fontFamily={fontFamily(l)}
                  letterSpacing={
                    l.customFont || l.garminFont?.startsWith("chalk")
                      ? 0
                      : l.kind === "time"
                        ? -4
                        : 0
                  }
                  fontSize={aod ? l.aodSize || l.size : l.size}
                  fontWeight={
                    l.customFont || l.garminFont?.startsWith("chalk")
                      ? 400
                      : l.fontWeight || (l.kind === "time" ? 600 : 400)
                  }
                  opacity={l.opacity ?? 1}
                  fill={aod ? l.aodColor || "#777777" : ink(l, preview)}
                >
                  {l.kind === "metric" && l.metricDecoration !== false
                    ? metricDecorations[l.source] || ""
                    : ""}
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
                          onDown?.(
                            e,
                            owners.get(l.id) || sourceLayers.get(l.id) || l,
                            i,
                          );
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
