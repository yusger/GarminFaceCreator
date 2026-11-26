import type { Layer } from "./domain";
import type { Preview } from "./Scene";
import { handPoints, handPolygon } from "./hands";
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
  if(l.handBitmap && l.image) {
    const side=2*Math.max(0,Math.min(p.cx,l.w-p.cx,p.cy,l.h-p.cy));
    const filterId="hand-aod-"+l.id;
    return <g>{aod&&<defs><filter id={filterId}><feFlood floodColor={l.aodColor||"#777777"}/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>}<image data-hand-type={l.handType||"hour"} data-hand-bitmap={l.handBitmap.setId} href={l.image} x={p.cx-side/2} y={p.cy-side/2} width={side} height={side} transform={`rotate(${p.angle} ${p.cx} ${p.cy})`} filter={aod?`url(#${filterId})`:undefined}/></g>;
  }
  const polygon=handPolygon(l,d.time,d.seconds,aod);
  if(polygon)return <polygon data-hand-type={l.handType||"hour"} data-hand-style={l.handShape!.id} points={polygon.map(p=>p.join(",")).join(" ")} fill={aod?l.aodColor||"#777777":l.color}/>;
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
