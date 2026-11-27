import {validateChart} from "./charts";
import {generationContext} from "./generationContext";
import {validPolygon} from "./geometry";
import {chatKinds,designCapabilityContext} from "./capabilities";
import {
  layer,
  uid,
  validateProject,
  metrics,
  type Layer,
  type Project,
} from "./domain";
import { designFields } from "./aiDesign";
import { generationDevice } from "./devices";
import { designSourceUnit } from "./generationRequirements";
import { widgets, insertWidget } from "./widgets";
import { resolveControls, setControl } from "./projectControls";
import { withEditorLayers } from "./editorHistory";
import { crossesScreen } from "./bounds";
export type ChatMessage = { role: "user" | "assistant"; content: string };
const kinds = chatKinds;
export const chatFields = designFields.filter(
  (k) => !["id", "kind", "referenceId", "groupId", "groupName"].includes(k),
);
const geometry = ["x", "y", "w", "h"];
const bools = [
  "activeVisible",
  "aod",
  "threshold",
  "meterContinuous",
  "groupThousands",
  "autoSourceFormat",
  "fillEnabled",
  "strokeEnabled",
  "allowClip",
];
const strings = [
  "name",
  "color",
  "text",
  "source",
  "aodColor",
  "aodSeconds",
  "textAlign",
  "garminFont",
  "timePart",
  "dateLocale",
  "dateFormat",
  "label",
  "unit",
  "missingValue",
  "thresholdFallback",
  "meterDimColor",
  "meterShape",
  "ringSource",
  "ringStyle",
  "ringCap",
  "handType",
  "handCap",
  "arcDirection",
  "strokeColor",
  "effectPrompt",
];
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function keys(v: unknown, allowed: string[]) {
  if (!object(v) || Object.keys(v).some((k) => !allowed.includes(k)))
    throw Error("AI 返回了未知字段，设计未修改");
}
export function chatFingerprint(p: Project) {
  return JSON.stringify({
    id: p.id,
    target: p.target,
    deviceSize: p.deviceSize,
    layers: p.layers,
    controls: p.controls,
    controlValues: p.controlValues,
    backgroundColor: p.backgroundColor,
    multiDevice: p.multiDevice,
    revision: p.revision,
  });
}
export function chatPayload(p: Project, selected: string[]) {
  const {projectId,revision,masterFingerprint,variantFingerprint}=generationContext(p,[]);
  const scene = resolveControls(p);
  const describe = (l: Layer): Record<string, unknown> => ({
    id: l.id,
    kind: l.kind,
    locked: l.locked,
    ...Object.fromEntries(
      chatFields
        .filter((k) => l[k as keyof Layer] !== undefined)
        .map((k) => [k, l[k as keyof Layer]]),
    ),
    ...(l.kind === "widget" && l.compound
      ? {
          parts: l.compound.parts.map(({ id, name, enabled, active, aod }) => ({
            id,
            name,
            enabled,
            active,
            aod,
          })),
          parameters: l.compound.controls.map((c) => ({
            id: c.id,
            label: c.label,
            type: c.type,
            options: c.options,
            value: l.compound!.controlValues?.[c.id] ?? c.default,
          })),
        }
      : {}),
  });
  return {
    protocol: "gfc-design-chat-v1",
    designIdentity:{projectId,revision,masterFingerprint,variantFingerprint},
    capabilities:designCapabilityContext(),
    device: generationDevice(p),
    coordinateSystem: { width: 454, height: 454, shape: "circle" },
    backgroundColor: p.backgroundColor,
    selectedLayerIds: selected,
    layers: scene.layers.map(describe),
    controls: p.controls?.map((c) => ({
      id: c.id,
      label: c.label,
      type: c.type,
      slot:c.slot,
      options: c.options,
      value: p.controlValues?.[c.id] ?? c.default,
    })),
    dataSources: Object.entries(metrics).map(([source, label]) => ({
      source,
      label,
      unit: designSourceUnit(source),
    })),
    widgets: widgets.map((w) => ({
      id: w.id,
      name: w.name,
      width: w.canvas.width,
      height: w.canvas.height,
    })),
    contract: {
      allowedProperties: chatFields,
      addKinds: kinds,
      maxOperations: 80,
      operations: [
        { type: "update", id: "existing id", patch: { x: 90 } },
        {
          type: "add",
          kind: "text",
          patch: { name: "标题", text: "HELLO", x: 120, y: 100, w: 180, h: 40 },
        },
        { type: "remove", id: "existing id" },
        { type: "addWidget", widgetId: "catalog id" },
        {
          type: "part",
          id: "widget id",
          partId: "existing part id",
          patch: { enabled: false },
        },
        {
          type: "control",
          id: "control id",
          widgetId: "optional existing widget id",
          value: "value",
        },
        { type: "background", color: "#101820" },
      ],
    },
  };
}
function patchLayer(l: Layer, patch: unknown): Layer {
  keys(patch, [...chatFields]);
  if (!Object.keys(patch as object).length) throw Error("AI 修改内容为空");
  if (
    l.kind === "widget" &&
    Object.keys(patch as object).some(
      (k) =>
        ![...geometry, "name", "activeVisible", "aod", "effectPrompt"].includes(
          k,
        ),
    )
  )
    throw Error("复合控件只能整体修改位置、尺寸或显示；配色请使用内部参数");
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if(k==="chart"){if(l.kind!=="chart"||!object(v))throw Error("AI图表配置无效");validateChart({...l,chart:v as Layer["chart"]});}
    else if(k === "polygonPoints"){if(l.kind!=="polygon"||!validPolygon(v))throw Error("AI多边形无效");}
    else if (k === "thresholdRules") {
      if (
        !Array.isArray(v) ||
        v.length > 8 ||
        v.some(
          (r) =>
            !object(r) ||
            Object.keys(r).some((k) => !["min", "max", "color"].includes(k)),
        )
      )
        throw Error("AI 阈值规则无效");
    } else if (
      bools.includes(k)
        ? typeof v !== "boolean"
        : strings.includes(k)
          ? typeof v !== "string"
          : typeof v !== "number" || !Number.isFinite(v)
    )
      throw Error("AI 属性类型无效：" + k);
    if (
      typeof v === "string" &&
      v.length > (k === "effectPrompt" ? 2000 : k === "text" ? 1000 : 80)
    )
      throw Error("AI 属性文字过长");
  }
  const next = { ...l, ...(patch as Partial<Layer>) };
  validateChart(next);
  if (
    next.kind === "metric" &&
    (!Object.hasOwn(metrics, next.source) ||
      (next.missingValue !== undefined && next.missingValue !== "--"))
  )
    throw Error("AI 数据来源或缺失值无效");
  if (
    next.x < -454 ||
    next.y < -454 ||
    next.x > 908 ||
    next.y > 908 ||
    next.w > 908 ||
    next.h > 908 ||
    Math.abs(next.rotation) > 360
  )
    throw Error("AI 几何超出范围");
  if (!next.allowClip && crossesScreen(next))
    throw Error("AI 修改超出圆屏，请要求保留安全边距");
  return next;
}
export function applyChat(
  p: Project,
  raw: string,
): { project: Project; message: string; changes: string[] } {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后使用 AI 设计助手");
  if (raw.length > 200000) throw Error("AI 返回内容过大");
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw Error("AI 未返回有效 JSON，设计未修改");
  }
  keys(data, ["message", "operations"]);
  if (
    typeof data.message !== "string" ||
    data.message.length > 3000 ||
    !Array.isArray(data.operations) ||
    data.operations.length > 80
  )
    throw Error("AI 对话结果格式无效");
  let next = structuredClone(p);
  const changes: string[] = [];
  for (const op of data.operations) {
    if (!object(op)) throw Error("AI 操作格式无效");
    if (op.type === "background") {
      keys(op, ["type", "color"]);
      if (typeof op.color !== "string" || !/^#[a-f0-9]{6}$/i.test(op.color))
        throw Error("背景色无效");
      next.backgroundColor = op.color;
      changes.push("背景色 → " + op.color);
    } else if (op.type === "add") {
      keys(op, ["type", "kind", "patch"]);
      if (!kinds.includes(op.kind)) throw Error("不支持添加该控件类型");
      const added = patchLayer({ ...layer(op.kind), id: uid() }, op.patch);
      next.layers.push(added);
      changes.push("添加：" + added.name);
    } else if (op.type === "addWidget") {
      keys(op, ["type", "widgetId"]);
      next = insertWidget(next, op.widgetId);
      changes.push("添加复合控件：" + next.layers.at(-1)!.name);
    } else if (op.type === "control") {
      keys(op, ["type", "id", "widgetId", "value"]);
      if (typeof op.value !== "string" && typeof op.value !== "boolean")
        throw Error("配置值无效");
      const root = op.widgetId
        ? next.layers.find((l) => l.id === op.widgetId)
        : undefined;
      if (op.widgetId && (!root?.compound || root.locked))
        throw Error("复合控件不存在或已锁定");
      const target = root?.compound;
      const state = target
        ? {
            ...next,
            multiDevice: undefined,
            layers: target.layers,
            controls: target.controls,
            controlValues: target.controlValues,
          }
        : next;
      const c = state.controls?.find((c) => c.id === op.id);
      if (!c) throw Error("配置项不存在");
      if (
        c.targets.some(
          (t) => state.layers.find((l) => l.id === t.layerId)?.locked,
        )
      )
        throw Error("配置目标已锁定");
      const applied = setControl(state, op.id, op.value);
      if (target) target.controlValues = applied.controlValues;
      else next = applied;
      changes.push("设置：" + c.label);
    } else {
      const root = next.layers.find((l) => l.id === op.id);
      if (!root || root.locked) throw Error("目标控件不存在或已锁定");
      if (op.type === "update") {
        keys(op, ["type", "id", "patch"]);
        const updated = patchLayer(root, op.patch);
        for (const c of next.controls || [])
          for (const t of c.targets.filter((t) => t.layerId === root.id)) {
            if (Object.hasOwn(op.patch, t.property))
              next = setControl(next, c.id, op.patch[t.property]);
            if (
              t.property.startsWith("thresholdRules.") &&
              Object.hasOwn(op.patch, "thresholdRules")
            )
              throw Error("该阈值颜色由配置控制，请使用 control 操作");
          }
        next.layers = next.layers.map((l) => (l.id === root.id ? updated : l));
        changes.push("调整：" + root.name);
      } else if (op.type === "remove") {
        keys(op, ["type", "id"]);
        next = withEditorLayers(
          next,
          next.layers.filter((l) => l.id !== root.id),
        );
        changes.push("删除：" + root.name);
      } else if (op.type === "part") {
        keys(op, ["type", "id", "partId", "patch"]);
        keys(op.patch, ["enabled", "active", "aod"]);
        const part = root.compound?.parts.find((v) => v.id === op.partId);
        if (
          !part ||
          !Object.keys(op.patch).length ||
          Object.values(op.patch).some((v) => typeof v !== "boolean")
        )
          throw Error("内部部件开关无效");
        Object.assign(part, op.patch);
        changes.push("部件：" + root.name + " / " + part.name);
      } else throw Error("AI 操作类型不支持");
    }
    if (next.layers.length > 160) throw Error("图层数量超限");
  }
  if (changes.length) {
    next.revision = p.revision + 1;
    next.codeRevision = -1;
    next.updated = Date.now();
  }
  validateProject(next);
  return { project: next, message: data.message, changes };
}
