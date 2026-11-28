import {captureComponentStyleEdits} from "./componentStyles.ts";
import {captureFontRoleEdits} from "./fontRoles.ts";
import { reconcileDevices, deviceKey } from "./multiDevice.ts";
import type { Layer, Project } from "./domain.ts";
export type EditorFrame = Pick<
  Project,
  | "componentStyles"
  | "fontRoles"
  | "multiDevice"
  | "target"
  | "deviceSize"
  | "assets"
  | "layers"
  | "controls"
  | "controlValues"
  | "backgroundColor"
  | "localFonts"
  | "bitmapFonts"
  | "themes"
>;
export function editorFrame(p: Project, layers = p.layers): EditorFrame {
  const resolved =
    layers === p.layers ? p : reconcileDevices(p, { ...p, layers })!;
  return structuredClone({
    layers,
    fontRoles:p.fontRoles,
    componentStyles:p.componentStyles,
    target: p.target,
    deviceSize: p.deviceSize,
    multiDevice: resolved.multiDevice,
    assets: p.assets,
    localFonts: p.localFonts,
    bitmapFonts: p.bitmapFonts,
    themes: p.themes,
    backgroundColor: p.backgroundColor,
    controls: p.controls,
    controlValues: p.controlValues,
  });
}
export function withEditorLayers(p: Project, layers: Layer[]): Project {
  const ids = new Set(layers.map((l) => l.id));
  const controls = p.controls
    ?.map((c) => ({
      ...c,
      targets: c.targets.filter((t) => ids.has(t.layerId)),
      preserveFormatFor: c.preserveFormatFor?.filter((id) => ids.has(id)),
      ...(c.sourceIcons
        ? {
            sourceIcons: Object.fromEntries(
              Object.entries(c.sourceIcons).map(([key, list]) => [
                key,
                list.filter((id) => ids.has(id)),
              ]),
            ),
          }
        : {}),
      hideWhenChangedFromDefault: c.hideWhenChangedFromDefault?.filter((id) =>
        ids.has(id),
      ),
    }))
    .filter((c) => c.targets.length);
  const valid = new Set(controls?.map((c) => c.id));
  return captureComponentStyleEdits(p,captureFontRoleEdits(p,{
    ...p,
    layers,
    assets: p.assets,
    ...(p.themes
      ? {
          themes: {
            ...p.themes,
            presets: p.themes.presets.map((t) => ({
              ...t,
              layerIds: [
                ...t.layerIds.filter((id) => ids.has(id)),
                ...(t.id === p.themes!.activeId
                  ? layers
                      .filter((l) => !p.layers.some((old) => old.id === l.id))
                      .map((l) => l.id)
                  : []),
              ],
              controlIds: t.controlIds.filter((id) => valid.has(id)),
            })),
          },
        }
      : {}),
    controls,
    controlValues: p.controlValues
      ? Object.fromEntries(
          Object.entries(p.controlValues).filter(([id]) => valid.has(id)),
        )
      : undefined,
  }));
}

// Restore design metadata while retaining current source history only as stale code.
export function restoreEditorFrame(p: Project, frame: EditorFrame): Project {
  if (!frame.multiDevice)
    return {
      ...p,
      ...structuredClone(frame),
      revision: p.revision + 1,
      codeRevision: -1,
    };
  const targetKey = deviceKey(frame),
    m = structuredClone(frame.multiDevice);
  m.viewVersion = (p.multiDevice?.viewVersion || 0) + 1;
  m.variants = m.variants.map((v) => {
    const current = p.multiDevice?.variants.find((c) => c.key === v.key);
    return {
      ...v,
      revision:
        v.key === targetKey
          ? p.revision + 1
          : (current?.revision || v.revision) + 1,
      code: { ...(current?.code || v.code), codeRevision: -1 },
      buildId: undefined,
      buildStatus: undefined,
    };
  });
  const active = m.variants.find((v) => v.key === targetKey);
  if (!active) throw Error("撤销的目标设备缺失");
  return {
    ...p,
    ...structuredClone(frame),
    ...active.code,
    multiDevice: m,
    revision: p.revision + 1,
    codeRevision: -1,
  };
}
