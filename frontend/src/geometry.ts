/** Same clockwise screen-space rotation as the SVG preview, about the layer center. */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  degrees: number,
): [number, number] {
  const a = (degrees * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}
export function layerTransform(l: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}) {
  return `translate(${l.x} ${l.y}) rotate(${l.rotation} ${l.w / 2} ${l.h / 2})`;
}
