import type { Project } from "./domain.ts";
import { controlValue, type ControlTarget } from "./projectControls.ts";
import { commitAppearanceChange } from "./fontRoles.ts";
export const colorRoleKinds = [
  { id: "primary", name: "主色" },
  { id: "accent", name: "强调色" },
  { id: "track", name: "暗轨" },
  { id: "text", name: "文字色" },
  { id: "warning", name: "警告色" },
  { id: "danger", name: "危险色" },
] as const;
function role(p: Project, id: string) {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后编辑颜色角色");
  const c = p.controls?.find((c) => c.id === id && c.type === "color");
  if (!c) throw Error("颜色配置不存在");
  const owner = p.themes?.presets.find((t) => t.controlIds.includes(id));
  if (
    owner &&
    owner.id !==
      (p.themes?.presets.find((t) => t.id === p.themes?.activeId)?.id ||
        p.themes?.defaultId)
  )
    throw Error("只能修改当前主题颜色角色");
  if (c.targets.some((t) => p.layers.find((l) => l.id === t.layerId)?.locked))
    throw Error("颜色角色含锁定图层");
  return c;
}
export function setColorRoleSemantic(
  p: Project,
  id: string,
  semantic?: string,
) {
  const c = role(p, id);
  if (semantic !== undefined && !colorRoleKinds.some((r) => r.id === semantic))
    throw Error("颜色角色用途无效");
  return commitAppearanceChange(p, {
    ...p,
    controls: p.controls!.map((r) =>
      r.id === c.id ? { ...r, semantic: semantic as typeof c.semantic } : r,
    ),
  });
}
export function detachColorTarget(
  p: Project,
  id: string,
  target: ControlTarget,
) {
  const c = role(p, id);
  if (
    !c.targets.some(
      (t) => t.layerId === target.layerId && t.property === target.property,
    )
  )
    throw Error("颜色角色关联不存在");
  const color = String(controlValue(p, c)),
    targets = c.targets.filter(
      (t) => t.layerId !== target.layerId || t.property !== target.property,
    ),
    controls = targets.length
      ? p.controls!.map((r) => (r.id === id ? { ...r, targets } : r))
      : p.controls!.filter((r) => r.id !== id),
    controlValues = { ...p.controlValues };
  if (!targets.length) delete controlValues[id];
  const layers = p.layers.map((l) => {
    if (l.id !== target.layerId) return l;
    if (target.property === "color") return { ...l, color };
    const index = Number(target.property.split(".")[1]);
    return {
      ...l,
      thresholdRules: l.thresholdRules!.map((r, i) =>
        i === index ? { ...r, color } : r,
      ),
    };
  });
  const themes = p.themes
    ? {
        ...p.themes,
        presets: p.themes.presets.map((t) => ({
          ...t,
          controlIds: t.controlIds.filter((id) =>
            controls.some((c) => c.id === id),
          ),
        })),
      }
    : undefined;
  return commitAppearanceChange(p, {
    ...p,
    layers,
    controls,
    controlValues,
    themes,
  });
}
