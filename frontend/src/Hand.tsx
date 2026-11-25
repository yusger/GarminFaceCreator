import type { Layer } from "./domain";
import type { Preview } from "./Scene";
import { handPoints } from "./hands";
export default function Hand({
  layer: l,
  preview: d,
  aod = false,
}: {
  layer: Layer;
  preview: Preview;
  aod?: boolean;
}) {
  const p = handPoints(l, d.time, d.seconds, aod);
  if (!p) return null;
  return (
    <line
      data-hand-type={l.handType || "hour"}
      x1={p.x1}
      y1={p.y1}
      x2={p.x2}
      y2={p.y2}
      stroke={aod ? l.aodColor || "#777777" : l.color}
      strokeWidth={l.strokeWidth || 6}
      strokeLinecap={l.handCap || "butt"}
    />
  );
}
