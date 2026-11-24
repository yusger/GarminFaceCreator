import type { Layer } from "./domain";
export function anchorOffset(l: Layer) {
  const anchor = l.anchor || "topLeft",
    x = anchor === "center" ? l.w / 2 : anchor.endsWith("Right") ? l.w : 0,
    y = anchor === "center" ? l.h / 2 : anchor.startsWith("bottom") ? l.h : 0;
  const a = (l.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return {
    x: l.w / 2 + (x - l.w / 2) * c - (y - l.h / 2) * s,
    y: l.h / 2 + (x - l.w / 2) * s + (y - l.h / 2) * c,
  };
}
export function anchorPosition(l: Layer) {
  const offset = anchorOffset(l);
  return { x: l.x + offset.x, y: l.y + offset.y };
}
export function coordinatePatch(l: Layer, key: "x" | "y", value: number) {
  return { [key]: value - anchorOffset(l)[key] };
}
