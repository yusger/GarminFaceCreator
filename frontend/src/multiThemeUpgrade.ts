import { applyDeviceOverride } from "./deviceOverrides.ts";
import { bitmapFontDiagnostics } from "./bitmapFonts.ts";
import { validateProject, type Project } from "./domain.ts";
import { migrateProject } from "./migrations.ts";
import { effectiveLayers, deviceKey } from "./multiDevice.ts";
import type { ThemeUpgradeResult } from "./themeUpgrade.ts";
import { themeUpgradeBase } from "./themeUpgrade.ts";
const owner = (p: Project, id: string) =>
  p.themes?.presets.find((t) => t.layerIds.includes(id))?.id || "common";
// Upgrade one shared definition, rebase existing target variants, and validate the complete transaction.
export function upgradeMultiDeviceThemes(
  current: Project,
  value: unknown,
  single: (p: Project, v: unknown) => ThemeUpgradeResult,
): ThemeUpgradeResult {
  const incoming = migrateProject(value);
  validateProject(incoming);
  const previous = current.multiDevice!,
    nextMaster = incoming.multiDevice?.master || incoming.layers;
  const base = {
    ...current,
    multiDevice: undefined,
    layers: structuredClone(previous.master),
  };
  const definition = {
    ...incoming,
    multiDevice: undefined,
    layers: structuredClone(nextMaster),
    target: current.target,
    deviceSize: current.deviceSize,
  };
  if (
    !incoming.multiDevice &&
    (incoming.target !== current.target ||
      incoming.deviceSize !== current.deviceSize)
  )
    throw Error("更新文件的目标型号和尺寸须与当前项目相同");
  const checked = single(base, definition),
    next = checked.project,
    warnings = [...checked.warnings],
    ids = new Map(next.layers.map((l) => [l.id, l]));
  const localIds = new Set<string>(),
    bitmapIds = new Set<string>();
  const variants = previous.variants.map((v) => {
    const defaults =
      incoming.multiDevice?.variants.find((n) => n.key === v.key)?.overrides ||
      {};
    const overrides = structuredClone(defaults);
    for (const [id, patch] of Object.entries(v.overrides)) {
      const old = previous.master.find((l) => l.id === id),
        updated = ids.get(id);
      if (
        !old ||
        !updated ||
        old.kind !== updated.kind ||
        owner(base, id) !== owner(next, id)
      ) {
        warnings.push("未保留已移除或不兼容的设备微调：" + v.key + " / " + id);
        continue;
      }
      const kept = structuredClone(patch);
      if (
        ["customFont", "garminFont", "bitmapFontId"].some((key) =>
          Object.hasOwn(patch, key),
        )
      ) {
        const oldFont = applyDeviceOverride(old, patch);
        for (const key of [
          "customFont",
          "garminFont",
          "bitmapFontId",
          "fontWeight",
          "bitmapTracking",
          "bitmapTabular",
          "bitmapBaselineShift",
          "bitmapLineHeight",
        ] as const)
          Object.assign(kept, { [key]: oldFont[key] ?? null });
        if (oldFont.bitmapFontId) {
          kept.size = oldFont.size;
          kept.aodSize = oldFont.aodSize || oldFont.size;
        }
      }
      if (kept.compoundOverrides) {
        const parts = Object.fromEntries(
          Object.entries(kept.compoundOverrides).filter(([part]) => {
            const oldPart = old.compound?.layers.find((l) => l.id === part),
              newPart = updated.compound?.layers.find((l) => l.id === part);
            const compatible =
              !!oldPart && !!newPart && oldPart.kind === newPart.kind;
            if (!compatible)
              warnings.push(
                "未保留已移除的复合部件微调：" +
                  v.key +
                  " / " +
                  id +
                  " / " +
                  part,
              );
            return compatible;
          }),
        );
        if (Object.keys(parts).length) kept.compoundOverrides = parts;
        else delete kept.compoundOverrides;
      }
      overrides[id] = { ...(overrides[id] || {}), ...kept };
    }
    // Removed defaults cannot survive an incoming definition either (validated input normally prevents this).
    for (const id of Object.keys(overrides))
      if (!ids.has(id)) delete overrides[id];
    const layers = effectiveLayers(next.layers, { ...v, overrides });
    for (const l of layers) {
      if (l.customFont?.id.startsWith("local_")) localIds.add(l.customFont.id);
      if (l.bitmapFontId) bitmapIds.add(l.bitmapFontId);
    }
    return {
      ...v,
      overrides,
      revision: v.revision + 1,
      code: { ...v.code, codeRevision: -1 },
      buildId: undefined,
      buildStatus: undefined,
    };
  });
  for (const f of current.localFonts || []) {
    const n = next.localFonts?.find((n) => n.id === f.id);
    if (n && (n.data !== f.data || n.file !== f.file || n.family !== f.family))
      throw Error("更新复用了不同内容的本地字体身份：" + f.id);
  }
  for (const f of current.bitmapFonts || []) {
    const n = next.bitmapFonts?.find((n) => n.id === f.id);
    if (n && (n.descriptor !== f.descriptor || n.atlasData !== f.atlasData))
      throw Error("更新复用了不同内容的位图字体身份：" + f.id);
  }
  const retainedLocal = (current.localFonts || []).filter(
    (f) => localIds.has(f.id) && !next.localFonts?.some((n) => n.id === f.id),
  );
  const retainedBitmap = (current.bitmapFonts || []).filter(
    (f) => bitmapIds.has(f.id) && !next.bitmapFonts?.some((n) => n.id === f.id),
  );
  const key = deviceKey(current),
    variant = variants.find((v) => v.key === key)!;
  const result: Project = {
    ...next,
    localFonts: [...(next.localFonts || []), ...retainedLocal],
    bitmapFonts: [...(next.bitmapFonts || []), ...retainedBitmap],
    multiDevice: {
      ...previous,
      master: structuredClone(next.layers),
      variants,
      viewVersion: (previous.viewVersion || 0) + 1,
    },
    layers:
      previous.scope === "master"
        ? structuredClone(next.layers)
        : effectiveLayers(next.layers, variant),
    revision: current.revision + 1,
    codeRevision: -1,
  };
  variant.revision = result.revision;
  try {
    validateProject(result);
    for (const v of variants) {
      const problems = bitmapFontDiagnostics({
        ...result,
        multiDevice: undefined,
        target: v.target,
        deviceSize: v.deviceSize,
        layers: effectiveLayers(result.multiDevice!.master, v),
      });
      if (problems.length)
        throw Error(v.key + " / " + problems.map((p) => p.message).join("；"));
    }
  } catch (e) {
    throw Error(
      "设备覆盖或保留资源与新定义不兼容，未应用任何更新：" +
        (e as Error).message,
    );
  }
  return {
    ...checked,
    project: result,
    warnings,
    retained: [
      ...checked.retained,
      ...variants.flatMap((v) =>
        Object.keys(v.overrides).map((id) => "device:" + v.key + ":" + id),
      ),
    ],
    base: themeUpgradeBase(current),
  };
}
