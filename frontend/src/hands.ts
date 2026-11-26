import type { Layer } from "./domain";
export function handOrbit(l: Layer) {
  const cx = l.w * (l.handPivotX ?? 0.5),
    cy = l.h * (l.handPivotY ?? 0.5),
    stroke = l.strokeWidth || 6,
    radius = Math.max(0, Math.min(cx, l.w - cx, cy, l.h - cy) - stroke / 2);
  return {
    cx,
    cy,
    radius,
    extent:
      radius * Math.max(l.handReach ?? 0.58, l.handTail ?? 0.08) + stroke / 2,
  };
}
export function handPoints(
  l: Layer,
  time: string,
  seconds: number,
  aod = false,
) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const sec = aod ? 0 : seconds;
  if (!Number.isFinite(sec) || sec < 0 || sec >= 60) return null;
  if (aod && l.handType === "second" && l.aodSeconds === "hide") return null;
  const [hour, minute] = time.split(":").map(Number),
    { cx, cy, radius } = handOrbit(l),
    degrees =
      l.handType === "second"
        ? sec * 6
        : l.handType === "minute"
          ? (minute + sec / 60) * 6
          : ((hour % 12) + minute / 60 + sec / 3600) * 30,
    a = (degrees * Math.PI) / 180,
    dx = Math.sin(a),
    dy = -Math.cos(a),
    reach = l.handReach ?? 0.58,
    tail = l.handTail ?? 0.08;
  return {
    x1: cx - dx * radius * tail,
    y1: cy - dy * radius * tail,
    x2: cx + dx * radius * reach,
    y2: cy + dy * radius * reach,
    cx,
    cy,
    angle: degrees,
  };
}

export function handPolygon(l:Layer,time:string,seconds:number,aod=false) {
 if(!l.handShape)return null;
 const p=handPoints(l,time,seconds,aod);if(!p)return null;
 const {radius}=handOrbit(l),reach=l.handReach??.58,tail=l.handTail??.08;
 const span=radius*reach;if(span<=0)return null;
 const dx=(p.x2-p.cx)/span,dy=(p.y2-p.cy)/span;
 return l.handShape.points.map(([u,v])=>{
  const along=v*radius*(v>=0?reach:tail),across=u*(l.strokeWidth||6)/2;
  return [p.cx+dx*along-dy*across,p.cy+dy*along+dx*across] as [number,number];
 });
}
