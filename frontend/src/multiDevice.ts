import type {
  Project,
  Layer,
  CodeFile,
  CodeVersion,
  CodeProvenance,
} from "./domain";
import { devices, deviceFor } from "./devices";
export const overrideKeys = [
  "x",
  "y",
  "w",
  "h",
  "size",
  "rotation",
  "color",
  "strokeColor",
  "strokeWidth",
  "aod",
  "aodColor",
  "aodSize",
  "exportIncluded",
  "hidden",
] as const;
export type LayerOverride = Partial<Pick<Layer, (typeof overrideKeys)[number]>>;
type CodeState = Pick<
  Project,
  "files" | "versions" | "codeRevision" | "codeProvenance" | "activeCodeVersion"
>;
export type DeviceVariant = {
  key: string;
  target: string;
  deviceSize: string;
  overrides: Record<string, LayerOverride>;
  revision: number;
  code: CodeState;
  buildId?: string;
  buildStatus?: string;
};
export type MultiDevice = {
  master: Layer[];
  scope: "master" | "device";
  viewVersion?: number;
  variants: DeviceVariant[];
};
export const deviceKey = (p: { target?: string; deviceSize?: string }) => {
  const d = deviceFor(p);
  return d.id + ":" + d.size;
};
function code(p: Project): CodeState {
  return structuredClone({
    files: p.files,
    versions: p.versions,
    codeRevision: p.codeRevision,
    codeProvenance: p.codeProvenance,
    activeCodeVersion: p.activeCodeVersion,
  });
}
const emptyCode = (): CodeState => ({
  files: [],
  versions: [],
  codeRevision: -1,
});
export function enableDevices(p: Project): Project {
  if (p.multiDevice) return p;
  const d = deviceFor(p);
  return {
    ...p,
    multiDevice: {
      master: structuredClone(p.layers),
      scope: "master",
      variants: [
        {
          key: deviceKey(p),
          target: d.id,
          deviceSize: d.size,
          overrides: {},
          revision: p.revision,
          code: code(p),
        },
      ],
    },
  };
}
export function effectiveLayers(master: Layer[], v: DeviceVariant): Layer[] {
  return master.map((l) => ({ ...l, ...v.overrides[l.id] }));
}
function capture(p: Project): Project {
  if (!p.multiDevice) return p;
  return {
    ...p,
    multiDevice: {
      ...p.multiDevice,
      variants: p.multiDevice.variants.map((v) =>
        v.key === deviceKey(p)
          ? { ...v, revision: p.revision, code: code(p) }
          : v,
      ),
    },
  };
}
export function selectDevice(
  input: Project,
  key: string,
  scope?: "master" | "device",
): Project {
  const p = capture(enableDevices(input)),
    m = p.multiDevice!,
    v = m.variants.find((v) => v.key === key);
  if (!v) throw Error("适配设备不存在");
  const nextScope = scope || m.scope;
  // Master editing displays the unmodified shared design. Device mode displays the resolved variant.
  return {
    ...p,
    ...v.code,
    target: v.target,
    deviceSize: v.deviceSize,
    revision: v.revision,
    layers: structuredClone(
      nextScope === "master" ? m.master : effectiveLayers(m.master, v),
    ),
    multiDevice: {
      ...m,
      scope: nextScope,
      viewVersion: (m.viewVersion || 0) + 1,
    },
    updated: Date.now(),
  };
}
export function addDevice(
  input: Project,
  d: (typeof devices)[number],
): Project {
  let p = capture(enableDevices(input));
  const m = p.multiDevice!,
    key = deviceKey({ target: d.id, deviceSize: d.size });
  if (m.variants.some((v) => v.key === key))
    return selectDevice(p, key, "device");
  p = {
    ...p,
    multiDevice: {
      ...m,
      variants: [
        ...m.variants,
        {
          key,
          target: d.id,
          deviceSize: d.size,
          overrides: {},
          revision: 0,
          code: emptyCode(),
        },
      ],
    },
  };
  return selectDevice(p, key, "device");
}
export function reconcileDevices(
  previous: Project | null,
  next: Project | null,
): Project | null {
  if (
    !next ||
    !previous ||
    next.id !== previous.id ||
    !previous.multiDevice ||
    !next.multiDevice
  )
    return next;
  // Selection/reset helpers already materialize their own layers and state.
  if (
    previous.target !== next.target ||
    previous.deviceSize !== next.deviceSize ||
    previous.multiDevice.viewVersion !== next.multiDevice.viewVersion
  )
    return next;
  const m = next.multiDevice;
  if (JSON.stringify(previous.layers) === JSON.stringify(next.layers))
    return capture(next);
  if (m.scope === "master") {
    const ids = new Set(next.layers.map((l) => l.id));
    const variants = m.variants.map((v) => ({
      ...v,
      revision: v.key === deviceKey(next) ? next.revision : v.revision + 1,
      overrides: Object.fromEntries(
        Object.entries(v.overrides).filter(([id]) => ids.has(id)),
      ),
    }));
    return capture({
      ...next,
      multiDevice: { ...m, master: structuredClone(next.layers), variants },
    });
  }
  if (
    next.layers.length !== m.master.length ||
    next.layers.some((l, i) => l.id !== m.master[i].id)
  )
    throw Error("请切换共享主设计后添加、删除或重排图层");
  const overrides: Record<string, LayerOverride> = {};
  next.layers.forEach((l, i) => {
    const base = m.master[i],
      old = previous.layers[i];
    for (const key of Object.keys(l) as (keyof Layer)[])
      if (
        !overrideKeys.includes(key as any) &&
        JSON.stringify(l[key]) !== JSON.stringify(old[key])
      )
        throw Error(
          "设备微调支持位置、尺寸、颜色和显示开关；其他修改请切换共享主设计",
        );
    const patch: LayerOverride = {};
    for (const key of overrideKeys)
      if (JSON.stringify(l[key]) !== JSON.stringify(base[key]))
        Object.assign(patch, { [key]: l[key] });
    if (Object.keys(patch).length) overrides[l.id] = patch;
  });
  return capture({
    ...next,
    multiDevice: {
      ...m,
      variants: m.variants.map((v) =>
        v.key === deviceKey(next) ? { ...v, overrides } : v,
      ),
    },
  });
}
export function resetDevice(p: Project): Project {
  const current = capture(p),
    m = current.multiDevice!;
  const next = {
    ...current,
    revision: current.revision + 1,
    multiDevice: {
      ...m,
      variants: m.variants.map((v) =>
        v.key === deviceKey(p)
          ? { ...v, overrides: {}, revision: v.revision + 1 }
          : v,
      ),
    },
  };
  return selectDevice(next, deviceKey(p), "device");
}
export function projectForDevice(p: Project, key: string): Project {
  const resolved = selectDevice(p, key, "device");
  return { ...resolved, multiDevice: undefined };
}

export function validateMultiDevice(
  p: Project,
  validate: (p: Project) => unknown,
) {
  const m = p.multiDevice;
  if (!m) return;
  if (
    !Array.isArray(m.master) ||
    !Array.isArray(m.variants) ||
    m.variants.length < 1 ||
    m.variants.length > devices.length ||
    !["master", "device"].includes(m.scope)
  )
    throw Error("多设备配置无效");
  validate({ ...p, multiDevice: undefined, layers: m.master });
  const ids = new Set(m.master.map((l) => l.id)),
    keys = new Set<string>();
  if (ids.size !== m.master.length) throw Error("主设计图层标识重复");
  for (const v of m.variants) {
    if (
      !devices.some((d) => d.id === v.target && d.size === v.deviceSize) ||
      v.key !== deviceKey(v) ||
      keys.has(v.key) ||
      !Number.isSafeInteger(v.revision) ||
      v.revision < 0 ||
      !v.overrides ||
      typeof v.overrides !== "object" ||
      Array.isArray(v.overrides)
    )
      throw Error("适配设备配置无效");
    keys.add(v.key);
    for (const [id, patch] of Object.entries(v.overrides)) {
      if (
        !ids.has(id) ||
        !patch ||
        typeof patch !== "object" ||
        Array.isArray(patch) ||
        Object.keys(patch).some((k) => !overrideKeys.includes(k as any))
      )
        throw Error("设备图层微调无效");
      for (const [key, value] of Object.entries(patch)) {
        if (
          ["aod", "exportIncluded", "hidden"].includes(key)
            ? typeof value !== "boolean"
            : ["color", "strokeColor", "aodColor"].includes(key)
              ? typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)
              : typeof value !== "number" || !Number.isFinite(value)
        )
          throw Error("设备微调属性无效");
      }
    }
    validate({
      ...p,
      multiDevice: undefined,
      layers: effectiveLayers(m.master, v),
    });
  }
  if (!keys.has(deviceKey(p))) throw Error("当前设备不在适配列表中");
  const v = m.variants.find((v) => v.key === deviceKey(p))!;
  if (
    JSON.stringify(p.layers) !==
    JSON.stringify(
      m.scope === "master" ? m.master : effectiveLayers(m.master, v),
    )
  )
    throw Error("当前图层与适配配置不一致");
}
export function importedDevices(original: Project, imported: Project): Project {
  const m = original.multiDevice;
  if (!m) return imported;
  const ids = new Map(
    original.layers.map((l, i) => [l.id, imported.layers[i].id]),
  );
  return {
    ...imported,
    multiDevice: {
      master: m.master.map((l) => ({ ...l, id: ids.get(l.id)! })),
      scope: m.scope,
      variants: m.variants.map((v) => ({
        ...v,
        revision: 0,
        code: emptyCode(),
        buildId: undefined,
        buildStatus: undefined,
        overrides: Object.fromEntries(
          Object.entries(v.overrides).map(([id, patch]) => [
            ids.get(id)!,
            patch,
          ]),
        ),
      })),
    },
  };
}
