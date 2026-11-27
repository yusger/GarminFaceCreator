import { useId } from "react";
import type { Layer, Project } from "./domain";
import { generationDevice } from "./devices";
import { bitmapFontInfo } from "./bitmapFonts.ts";
import { bitmapTextLayout } from "./bitmapFontLayout.ts";
export default function BitmapFontText({
  project,
  layer: l,
  text,
  color,
}: {
  project: Project;
  layer: Layer;
  text: string;
  color: string;
}) {
  const prefix = useId().replaceAll(":", ""),
    f = project.bitmapFonts?.find((f) => f.id === l.bitmapFontId);
  if (!f) return <text fill="#ff5566">缺少位图字体</text>;
  const info = bitmapFontInfo(f),
    scale = generationDevice(project).screenWidth / 454,
    layout = bitmapTextLayout(
      info,
      text,
      Math.trunc(l.x * scale),
      Math.trunc(l.y * scale),
      Math.trunc(l.w * scale),
      Math.trunc(l.h * scale),
      l.textAlign,
    );
  return (
    <g data-bitmap-font={f.id} aria-label={text} opacity={l.opacity ?? 1}>
      <title>{text}</title>
      {layout.glyphs.map((p, i) => {
        const g = p.glyph,
          x = p.x / scale - l.x,
          y = p.y / scale - l.y;
        if (!g)
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.ceil(info.size / 2) / scale}
              height={info.lineHeight / scale}
              stroke={color}
              fill="none"
            />
          );
        if (!g.width || !g.height) return null;
        const id = prefix + "glyph" + i;
        return (
          <svg
            key={i}
            x={x}
            y={y}
            width={g.width / scale}
            height={g.height / scale}
            viewBox={`${g.x} ${g.y} ${g.width} ${g.height}`}
            overflow="hidden"
          >
            <defs>
              <mask
                id={id}
                maskUnits="userSpaceOnUse"
                x={g.x}
                y={g.y}
                width={g.width}
                height={g.height}
                style={{ maskType: "luminance", colorInterpolation: "sRGB" }}
              >
                <image
                  href={f.atlasData}
                  width={info.width}
                  height={info.height}
                />
              </mask>
            </defs>
            <rect
              x={g.x}
              y={g.y}
              width={g.width}
              height={g.height}
              fill={color}
              mask={`url(#${id})`}
            />
          </svg>
        );
      })}
    </g>
  );
}
