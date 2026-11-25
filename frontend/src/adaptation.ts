import type { Project, Profile } from "./domain";
import { generationDevice } from "./devices";
import {
  overrideKeys,
  projectForDevice,
  deviceKey,
  selectDevice,
  reconcileDevices,
} from "./multiDevice";
import { redactRepair } from "./repair";
import { crossesScreen } from "./bounds";
export type AdaptationChange = {
  id: string;
  patch: Record<string, number | string | boolean>;
};
export function adaptationFingerprint(p: Project) {
  return JSON.stringify({
    key: deviceKey(p),
    layers: projectForDevice(p, deviceKey(p)).layers,
    master: p.multiDevice?.master,
    revision: p.revision,
  });
}
export function adaptationPayload(
  p: Project,
  profile: Profile,
  instruction: string,
) {
  if (!p.multiDevice) throw Error("请先启用多设备适配");
  const resolved = projectForDevice(p, deviceKey(p));
  return {
    device: generationDevice(resolved),
    designCoordinates: { width: 454, height: 454 },
    instruction: redactRepair(instruction.slice(0, 4000), [profile.key]),
    constraints: {
      allowedProperties: overrideKeys,
      keepIds: true,
      noAddDelete: true,
      noBindingChange: true,
      lockedLayersUnchanged: true,
    },
    layers: resolved.layers.map((l) => {
      const safe = Object.fromEntries(overrideKeys.map((k) => [k, l[k]]));
      return {
        ...safe,
        id: l.id,
        kind: l.kind,
        source: l.source,
        name: redactRepair(l.name, [profile.key]),
        text: redactRepair(l.text, [profile.key]),
        locked: !!l.locked,
      };
    }),
  };
}
export function parseAdaptation(p: Project, raw: string): AdaptationChange[] {
  if (raw.length > 120000) throw Error("适配结果过大");
  const parsed = JSON.parse(raw);
  if (
    !parsed ||
    Object.keys(parsed).some((k) => k !== "changes") ||
    !Array.isArray(parsed.changes) ||
    !parsed.changes.length ||
    parsed.changes.length > 200
  )
    throw Error("需要非空 changes 列表");
  const resolved = projectForDevice(p, deviceKey(p)),
    seen = new Set<string>();
  for (const change of parsed.changes) {
    if (
      !change ||
      Object.keys(change).some((k) => !["id", "patch"].includes(k)) ||
      typeof change.id !== "string" ||
      seen.has(change.id) ||
      !change.patch ||
      typeof change.patch !== "object" ||
      Array.isArray(change.patch) ||
      !Object.keys(change.patch).length
    )
      throw Error("适配差异格式无效");
    seen.add(change.id);
    const l = resolved.layers.find((l) => l.id === change.id);
    if (!l || l.locked) throw Error("不能修改不存在或已锁定的图层");
    for (const [key, value] of Object.entries(change.patch)) {
      if (!overrideKeys.includes(key as any))
        throw Error("适配不能更改绑定、图片、身份或源码");
      if (
        ["aod", "exportIncluded", "hidden"].includes(key)
          ? typeof value !== "boolean"
          : ["color", "strokeColor", "aodColor"].includes(key)
            ? typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)
            : typeof value !== "number" || !Number.isFinite(value)
      )
        throw Error("适配属性类型无效");
      if (
        typeof value === "number" &&
        (Math.abs(value) > 908 ||
          (["w", "h", "size", "aodSize", "strokeWidth"].includes(key) &&
            value <= 0) ||
          (["size", "aodSize"].includes(key) && value > 200) ||
          (key === "strokeWidth" && value > 32))
      )
        throw Error("适配数值超出允许范围");
    }
    if (crossesScreen({ ...l, ...change.patch }))
      throw Error("适配结果使关键图层越出圆形屏幕，请调整后重试");
  }
  return parsed.changes;
}
export function applyAdaptation(
  p: Project,
  changes: AdaptationChange[],
): Project {
  const current = selectDevice(p, deviceKey(p), "device");
  // Revalidate at application time; code is never part of the patch.
  const checked = parseAdaptation(current, JSON.stringify({ changes }));
  return reconcileDevices(current, {
    ...current,
    layers: current.layers.map((l) => ({
      ...l,
      ...checked.find((c) => c.id === l.id)?.patch,
    })),
    revision: current.revision + 1,
    updated: Date.now(),
  })!;
}
