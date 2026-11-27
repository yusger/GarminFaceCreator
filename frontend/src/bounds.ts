import { handOrbit } from "./hands";
import type { Layer } from "./domain";
export function crossesScreen(
  layer: Layer,
  textSize?: { width: number; height: number },
) {
  if (layer.allowClip || layer.exportIncluded === false) return false;
  const angle = (layer.rotation * Math.PI) / 180,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  const cx = layer.x + layer.w / 2,
    cy = layer.y + layer.h / 2;
  if (layer.kind === "hand") {
    const p = handOrbit(layer),
      x = p.cx - layer.w / 2,
      y = p.cy - layer.h / 2;
    return (
      Math.hypot(cx + x * cos - y * sin - 227, cy + x * sin + y * cos - 227) +
        p.extent >
      227.000001
    );
  }
  const width = textSize?.width ?? layer.w,
    height = textSize?.height ?? layer.h;
  const x = textSize
    ? layer.textAlign === "left"
      ? 0
      : layer.textAlign === "right"
        ? layer.w - width
        : (layer.w - width) / 2
    : 0;
  const y = textSize ? (layer.h - height) / 2 : 0;
  const points =
    layer.kind === "polygon" ? layer.polygonPoints!.map(([x,y])=>[x*layer.w,y*layer.h]) :
    layer.kind === "circle" || layer.kind === "ring"
      ? Array.from({ length: 128 }, (_, i) => [
          layer.w / 2 + (Math.cos((i * Math.PI) / 64) * layer.w) / 2,
          layer.h / 2 + (Math.sin((i * Math.PI) / 64) * layer.h) / 2,
        ])
      : layer.kind === "line"
        ? [
            [0, 0],
            [layer.w, layer.h],
          ]
        : [
            [x, y],
            [x + width, y],
            [x, y + height],
            [x + width, y + height],
          ];
  return points.some(
    ([px, py]) =>
      Math.hypot(
        cx + (px - layer.w / 2) * cos - (py - layer.h / 2) * sin - 227,
        cy + (px - layer.w / 2) * sin + (py - layer.h / 2) * cos - 227,
      ) > 227.000001,
  );
}
