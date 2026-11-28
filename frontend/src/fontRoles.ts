import type { Project, Layer } from "./domain.ts";
import { validateProject } from "./domain.ts";
import { approvedFontChoices, fontChoicePatch } from "./fontChoices.ts";
import { reconcileDevices } from "./multiDevice.ts";
export type FontRole = {
  id: string;
  name: string;
  themeId?: string;
  fontId: string;
  layerIds: string[];
};
const owner = (p: Project, id: string) =>
  p.themes?.presets.find((t) => t.layerIds.includes(id))?.id;
export const layerFontChoice = (l: Layer) =>
  l.bitmapFontId ||
  l.customFont?.id ||
  (["chalk", "chalkHan"].includes(l.garminFont || "")
    ? l.garminFont!
    : "system:" + (l.garminFont || "auto"));
const kinds = ["text", "time", "date", "metric", "chart"];
const active = (p: Project, r: FontRole) =>
  !r.themeId ||
  r.themeId ===
    (p.themes?.presets.find((t) => t.id === p.themes?.activeId)?.id ||
      p.themes?.defaultId);
export function validateFontRoles(p: Project) {
  if (p.fontRoles === undefined) return;
  if (!Array.isArray(p.fontRoles) || p.fontRoles.length > 32)
    throw Error("字体角色最多32项");
  const roles = new Set<string>(),
    members = new Set<string>(),
    approved = new Set(approvedFontChoices(p).map((f) => f.id)),
    layers = p.multiDevice?.master || p.layers;
  for (const r of p.fontRoles) {
    if (
      !r ||
      typeof r !== "object" ||
      Object.keys(r).some(
        (k) => !["id", "name", "themeId", "fontId", "layerIds"].includes(k),
      ) ||
      typeof r.id !== "string" ||
      !/^[a-z][a-z0-9-]{0,79}$/.test(r.id) ||
      roles.has(r.id) ||
      typeof r.name !== "string" ||
      !r.name.trim() ||
      r.name.length > 80 ||
      !approved.has(r.fontId) ||
      !Array.isArray(r.layerIds) ||
      !r.layerIds.length ||
      r.layerIds.length > 200 ||
      (r.themeId !== undefined &&
        !p.themes?.presets.some((t) => t.id === r.themeId))
    )
      throw Error("字体角色定义无效");
    roles.add(r.id);
    for (const id of r.layerIds) {
      const l = layers.find((l) => l.id === id);
      if (
        typeof id !== "string" ||
        members.has(id) ||
        !l ||
        !kinds.includes(l.kind) ||
        l.widgetOrigin ||
        owner(p, id) !== r.themeId ||
        layerFontChoice(l) !== r.fontId
      )
        throw Error("字体角色引用、归属或实际字体不一致");
      members.add(id);
    }
  }
}
function editable(p: Project, r?: FontRole) {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后编辑字体角色");
  if (r && !active(p, r)) throw Error("只能编辑当前主题的字体角色");
}
export function commitAppearanceChange(p: Project, next: Project) {
  const synced = reconcileDevices(p, {
    ...next,
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  })!;
  const out = synced.multiDevice
    ? {
        ...synced,
        multiDevice: {
          ...synced.multiDevice,
          viewVersion: (p.multiDevice?.viewVersion || 0) + 1,
        },
      }
    : synced;
  validateProject(out);
  return out;
}
export function createFontRole(
  p: Project,
  id: string,
  name: string,
  fontId: string,
  ids: string[],
) {
  editable(p);
  if (
    p.fontRoles?.some((r) => r.id === id) ||
    !ids.length ||
    new Set(ids).size !== ids.length
  )
    throw Error("字体角色身份或成员重复");
  const layers = p.layers.filter((l) => ids.includes(l.id));
  if (
    layers.length !== ids.length ||
    layers.some((l) => l.locked || !kinds.includes(l.kind) || l.widgetOrigin) ||
    p.fontRoles?.some((r) => r.layerIds.some((id) => ids.includes(id)))
  )
    throw Error("请选择未锁定且未绑定字体角色的独立文字控件");
  const themeId = owner(p, ids[0]);
  if (layers.some((l) => owner(p, l.id) !== themeId))
    throw Error("一个字体角色不能跨主题或公共框架");
  const role: FontRole = {
    id,
    name,
    fontId,
    layerIds: [...ids],
    ...(themeId ? { themeId } : {}),
  };
  editable(p, role);
  const patches = new Map(
    layers.map((l) => [l.id, fontChoicePatch(p, l, fontId)]),
  );
  return commitAppearanceChange(p, {
    ...p,
    fontRoles: [...(p.fontRoles || []), role],
    layers: p.layers.map((l) =>
      patches.has(l.id) ? { ...l, ...patches.get(l.id) } : l,
    ),
  });
}
export function setFontRole(p: Project, id: string, fontId: string) {
  const r = p.fontRoles?.find((r) => r.id === id);
  if (!r) throw Error("字体角色不存在");
  editable(p, r);
  const members = p.layers.filter((l) => r.layerIds.includes(l.id));
  if (members.some((l) => l.locked)) throw Error("字体角色含锁定图层，未修改");
  const patches = new Map(
    members.map((l) => [l.id, fontChoicePatch(p, l, fontId)]),
  );
  return commitAppearanceChange(p, {
    ...p,
    fontRoles: p.fontRoles!.map((x) => (x.id === id ? { ...x, fontId } : x)),
    layers: p.layers.map((l) =>
      patches.has(l.id) ? { ...l, ...patches.get(l.id) } : l,
    ),
  });
}
export function detachFontRole(p: Project, id: string, layerId?: string) {
  const r = p.fontRoles?.find((r) => r.id === id);
  if (!r) throw Error("字体角色不存在");
  editable(p, r);
  const removed = layerId ? [layerId] : r.layerIds;
  if (
    removed.some(
      (id) =>
        !r.layerIds.includes(id) || p.layers.find((l) => l.id === id)?.locked,
    )
  )
    throw Error("字体角色成员缺失或已锁定");
  return commitAppearanceChange(p, {
    ...p,
    fontRoles: p
      .fontRoles!.map((x) =>
        x.id === id
          ? { ...x, layerIds: x.layerIds.filter((id) => !removed.includes(id)) }
          : x,
      )
      .filter((x) => x.layerIds.length),
  });
}
// A manual font change is an explicit instance detachment; moving or resizing is not.
export function captureFontRoleEdits(before: Project, next: Project): Project {
  if (!next.fontRoles || next.multiDevice?.scope === "device") return next;
  const roles = next.fontRoles
    .map((r) => {
      const prior = before.fontRoles?.find((p) => p.id === r.id);
      if (!prior || prior.fontId !== r.fontId) return r;
      return {
        ...r,
        layerIds: r.layerIds.filter((id) => {
          if (!prior.layerIds.includes(id)) return true;
          const a = before.layers.find((l) => l.id === id),
            b = next.layers.find((l) => l.id === id);
          return (
            !!b &&
            (!a ||
              (layerFontChoice(a) === layerFontChoice(b) &&
                a.fontWeight === b.fontWeight))
          );
        }),
      };
    })
    .filter((r) => r.layerIds.length);
  return { ...next, fontRoles: roles };
}
export function remapFontRoles(original: Project, imported: Project) {
  if (!original.fontRoles) return;
  const ids = new Map(
    original.layers.map((l, i) => [l.id, imported.layers[i].id]),
  );
  imported.fontRoles = original.fontRoles.map((r) => ({
    ...r,
    layerIds: r.layerIds.map((id) => ids.get(id)!),
  }));
}
export function fontRolesForDevice(p: Project, layers: Layer[]) {
  return p.fontRoles
    ?.map((r) => ({
      ...r,
      layerIds: r.layerIds.filter((id) => {
        const l = layers.find((l) => l.id === id);
        return !!l && layerFontChoice(l) === r.fontId;
      }),
    }))
    .filter((r) => r.layerIds.length);
}

export function addFontRoleMembers(p: Project, id: string, ids: string[]) {
  const r = p.fontRoles?.find((r) => r.id === id);
  if (!r) throw Error("字体角色不存在");
  editable(p, r);
  return createFontRole(
    { ...p, fontRoles: p.fontRoles!.filter((r) => r.id !== id) },
    r.id,
    r.name,
    r.fontId,
    [...r.layerIds, ...ids],
  );
}
