export type Box = { x: number; y: number; w: number; h: number };
import type { Layer } from "./domain";
export function layerBox(l: Layer): Box {
  const a = (l.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a),
    cx = l.x + l.w / 2,
    cy = l.y + l.h / 2;
  const points = [
    [-l.w / 2, -l.h / 2],
    [l.w / 2, -l.h / 2],
    [-l.w / 2, l.h / 2],
    [l.w / 2, l.h / 2],
  ].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
export function groupBox(layers: Layer[]): Box {
  const boxes = layers.map(layerBox),
    x = Math.min(...boxes.map((b) => b.x)),
    y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
}
export function insideBox(l: Layer, box: Box) {
  const b = layerBox(l);
  return (
    b.x >= box.x &&
    b.y >= box.y &&
    b.x + b.w <= box.x + box.w &&
    b.y + b.h <= box.y + box.h
  );
}
