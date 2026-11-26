import type { Layer, Project } from "./domain";
import { validateProject } from "./domain";
import { layerBox } from "./selection";
import { cloneCompound } from "./widgets";
import { resolveControls } from "./projectControls";
import { crossesScreen } from "./bounds";
export function distributeLayers(
  layers: Layer[],
  ids: string[],
  axis: "x" | "y",
): Layer[] {
  const ordered = layers
    .filter((l) => ids.includes(l.id) && !l.locked)
    .sort((a, b) => layerBox(a)[axis] - layerBox(b)[axis]);
  if (ordered.length < 3) throw Error("等距分布需要至少三个未锁定控件");
  const size = axis === "x" ? "w" : "h",
    first = layerBox(ordered[0]),
    last = layerBox(ordered.at(-1)!);
  const gap =
    (last[axis] +
      last[size] -
      first[axis] -
      ordered.reduce((sum, l) => sum + layerBox(l)[size], 0)) /
    (ordered.length - 1);
  if (gap < 0) throw Error("空间不足，请拉开首尾控件后再等距分布");
  let cursor = first[axis];
  const positions = new Map<string, number>();
  for (const l of ordered) {
    positions.set(l.id, l[axis] + cursor - layerBox(l)[axis]);
    cursor += layerBox(l)[size] + gap;
  }
  return layers.map((l) =>
    positions.has(l.id) ? { ...l, [axis]: positions.get(l.id)! } : l,
  );
}
export type CircleOptions = {
  cx: number;
  cy: number;
  radius: number;
  start: number;
  sweep: number;
  count: number;
  rotate: boolean;
};
export function circleLayout(
  p: Project,
  ids: string[],
  o: CircleOptions,
  copy: boolean,
): Project {
  if (p.multiDevice?.scope === "device" && copy)
    throw Error("请切换共享主设计后复制控件");
  if (
    ![o.cx, o.cy, o.radius, o.start, o.sweep, o.count].every(Number.isFinite) ||
    o.radius < 1 ||
    o.radius > 220 ||
    o.cx < 0 ||
    o.cx > 454 ||
    o.cy < 0 ||
    o.cy > 454 ||
    Math.abs(o.start) > 360 ||
    o.sweep <= 0 ||
    o.sweep > 360 ||
    !Number.isInteger(o.count) ||
    o.count < 2 ||
    o.count > 120
  )
    throw Error("圆周参数无效");
  const chosen = p.layers.filter((l) => ids.includes(l.id) && !l.locked);
  if (copy ? chosen.length !== 1 : chosen.length < 2)
    throw Error(
      copy
        ? "圆周复制请选择一个未锁定控件"
        : "圆周分布请至少选择两个未锁定控件",
    );
  if (o.rotate && chosen.some((l) => l.kind === "widget"))
    throw Error("复合控件暂不支持整体旋转，请关闭随角度旋转");
  const count = copy ? o.count : chosen.length;
  if (p.layers.length + (copy ? count - 1 : 0) > 200)
    throw Error("最多200个顶层控件");
  const resolved = resolveControls(p).layers.find(
    (l) => l.id === chosen[0].id,
  )!;
  const originals = new Map<string, Layer>(),
    copies: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const source = copy ? (i === 0 ? chosen[0] : resolved) : chosen[i],
      l = copy && i > 0 ? cloneCompound(source) : structuredClone(source),
      angle = o.start + (i * o.sweep) / (o.sweep === 360 ? count : count - 1),
      r = (angle * Math.PI) / 180;
    l.x = o.cx + Math.sin(r) * o.radius - l.w / 2;
    l.y = o.cy - Math.cos(r) * o.radius - l.h / 2;
    if (o.rotate) l.rotation = (source.rotation + angle) % 360;
    if (crossesScreen(l)) throw Error("圆周布局超出屏幕，请减小半径或控件尺寸");
    if (copy && i > 0) {
      l.name = source.name + " 圆周" + (i + 1);
      l.groupId = undefined;
      l.groupName = undefined;
      copies.push(l);
    } else originals.set(l.id, l);
  }
  const next = {
    ...p,
    layers: [...p.layers.map((l) => originals.get(l.id) || l), ...copies],
  };
  validateProject(next);
  return next;
}
