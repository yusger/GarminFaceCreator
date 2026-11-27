import { validateProject, type Project } from "./domain.ts";
import { migrateProject } from "./migrations.ts";
import { isReference } from "./builtins.ts";
import { contextIdentity } from "./localIdentity.ts";
import { editorFrame } from "./editorHistory.ts";
export const themeUpgradeBase = (p: Project) =>
  contextIdentity({
    id: p.id,
    appId: p.appId,
    target: p.target,
    deviceSize: p.deviceSize,
    frame: editorFrame(p),
    multiDevice: p.multiDevice,
  });
const owner = (p: Project, id: string) =>
  p.themes?.presets.find((t) => t.controlIds.includes(id))?.id || "common";
const versionCompare = (a: string, b: string) => {
  const x = a.split(".").map(Number),
    y = b.split(".").map(Number);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};
export function upgradeThemeDefinition(current: Project, value: unknown) {
  if (isReference(current))
    throw Error("内置参考由资源库维护，请先复制到我的表盘");
  if (!current.themes) throw Error("当前项目没有主题定义");
  if (current.multiDevice)
    throw Error("主题升级暂不处理多设备覆盖，请先导出单设备副本");
  const incoming = migrateProject(value);
  validateProject(incoming);
  if (!incoming.themes) throw Error("更新文件没有主题定义");
  if (incoming.multiDevice)
    throw Error("更新文件须为单设备主题定义");
  if (!(
    (current.referenceId &&
      (incoming.id === current.referenceId ||
        incoming.referenceId === current.referenceId)) ||
    current.appId === incoming.appId
  ))
    throw Error("主题定义来源身份不匹配");
  if (
    current.target !== incoming.target ||
    current.deviceSize !== incoming.deviceSize
  )
    throw Error("更新文件的目标型号和尺寸须与当前项目相同");
  const prior = new Map(current.themes.presets.map((t) => [t.id, t]));
  let newer = 0;
  for (const theme of incoming.themes.presets) {
    const old = prior.get(theme.id);
    if (!old) {
      newer++;
      continue;
    }
    const cmp = versionCompare(theme.version, old.version);
    if (cmp < 0) throw Error("不能降级主题：" + theme.id);
    if (cmp > 0) newer++;
  }
  if (!newer) throw Error("更新至少需要一个更高版本或新增主题");
  for (const l of current.layers.filter((l) => l.locked)) {
    const next = incoming.layers.find((n) => n.id === l.id);
    if (!next || JSON.stringify(next) !== JSON.stringify(l))
      throw Error("更新会修改锁定对象，请先解锁：" + l.name);
  }
  const warnings: string[] = [],
    retained: string[] = [],
    values: Record<string, string | boolean> = {};
  for (const [id, value] of Object.entries(current.controlValues || {})) {
    const old = current.controls?.find((c) => c.id === id),
      c = incoming.controls?.find((c) => c.id === id);
    const valid =
      !!old &&
      !!c &&
      old.type === c.type &&
      owner(current, id) === owner(incoming, id) &&
      (c.type === "boolean"
        ? typeof value === "boolean"
        : c.type === "color"
          ? typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
          : typeof value === "string" && c.options?.includes(value));
    if (valid) {
      values[id] = value;
      retained.push(id);
    } else warnings.push("未保留已移除或不兼容的配置：" + id);
  }
  const overrides: NonNullable<NonNullable<Project["themes"]>["overrides"]> =
    {};
  for (const [id, v] of Object.entries(current.themes.overrides || {})) {
    if (
      incoming.themes.presets.some((t) => t.id === id) &&
      v &&
      typeof v.backgroundColor === "string" &&
      /^#[0-9a-f]{6}$/i.test(v.backgroundColor)
    )
      overrides[id] = { backgroundColor: v.backgroundColor };
    else warnings.push("未保留已移除或损坏的背景覆盖：" + id);
  }
  const active = incoming.themes.presets.some(
    (t) => t.id === current.themes!.activeId,
  )
    ? current.themes.activeId
    : incoming.themes.defaultId;
  if (active !== current.themes.activeId)
    warnings.push("当前主题已移除或无效，回到默认主题：" + active);
  for (const old of current.themes.presets)
    if (!incoming.themes.presets.some((t) => t.id === old.id))
      warnings.push("已移除主题：" + old.id);
  const next: Project = {
    ...current,
    schemaVersion: incoming.schemaVersion,
    layers: structuredClone(incoming.layers),
    controls: structuredClone(incoming.controls),
    localFonts: structuredClone(incoming.localFonts),
    bitmapFonts: structuredClone(incoming.bitmapFonts),
    assets: structuredClone(incoming.assets),
    backgroundColor: incoming.backgroundColor,
    themes: {
      ...structuredClone(incoming.themes),
      activeId: active,
      overrides,
    },
    controlValues: values,
    revision: current.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
  validateProject(next);
  return {
    project: next,
    retained,
    warnings,
    versions: incoming.themes.presets.map((t) => ({
      id: t.id,
      from: prior.get(t.id)?.version,
      to: t.version,
    })),
    base: themeUpgradeBase(current),
  };
}
