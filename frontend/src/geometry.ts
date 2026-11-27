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

export function regularPolygon(count: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)];
  });
}
/** First polygon contract: finite normalized points, strictly convex, 3..32 vertices. */
export function validPolygon(value: unknown): value is [number, number][] {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.length > 32 ||
    value.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some(
          (n) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1,
        ),
    )
  )
    return false;
  const p = value as number[][];
  // Every other vertex must lie strictly on the same side of each edge. Rejects crossings and duplicates.
  let sign = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    for (let j = 0; j < p.length; j++) {
      if (j === i || j === (i + 1) % p.length) continue;
      const c = p[j],
        cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(cross) < 1e-8) return false;
      if (sign && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
  }
  return true;
}
