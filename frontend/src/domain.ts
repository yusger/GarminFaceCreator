import { validateThresholds } from "./thresholds.ts";
import { migrateProject } from "./migrations.ts";
import { devices } from "./devices.ts";
export type Kind =
  | "time"
  | "date"
  | "metric"
  | "text"
  | "image"
  | "ring"
  | "rect"
  | "circle"
  | "line";
export type ThresholdRange = { min?: number; max?: number; color: string };
export type Layer = {
  id: string;
  name: string;
  groupId?: string;
  groupName?: string;
  anchor?: "topLeft" | "center" | "topRight" | "bottomLeft" | "bottomRight";
  exportIncluded?: boolean;
  guide?: boolean;
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  strokeColor?: string;
  opacity?: number;
  cornerRadius?: number;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  size: number;
  rotation: number;
  hidden: boolean;
  locked: boolean;
  text: string;
  source: string;
  image?: string;
  libraryIcon?: { id: string; recolor: boolean; strokeWidth: number };
  weatherIcon?: { period: "day" | "night" };
  assetId?: string;
  timePart?: "full" | "hours" | "minutes";
  textAlign?: "left" | "center" | "right";
  fontWeight?: 400 | 600 | 700;
  garminFont?: "auto" | "tiny" | "small" | "medium" | "large" | "numberHot";
  label?: string;
  unit?: string;
  precision?: number;
  missingValue?: string;
  allowClip?: boolean;
  thresholdRules?: ThresholdRange[];
  thresholdFallback?: string;
  ringTicks?: number;
  ringStart?: number;
  ringEnd?: number;
  ringWidth?: number;
  ringSource?: "seconds" | "steps" | "battery" | "heartRate" | "static";
  ringGoal?: number;
  ringDim?: number;
  aodColor?: string;
  aodSize?: number;
  aodSeconds?: "hide" | "zero";
  aod: boolean;
  threshold: boolean;
  strokeWidth?: number;
};
export type CodeFile = { path: string; content: string };
export type CodeProvenance = {
  primary: "ai" | "deterministic" | "reference" | "unknown";
  generatorVersion?: string;
  repairRootId?: string;
  patches?: { source: "ai" | "manual"; at: number }[];
};
export type CodeVersion = {
  provenance?: CodeProvenance;
  assets?: BinaryAsset[];
  id?: string;
  pinned?: boolean;
  at: number;
  revision: number;
  files: CodeFile[];
};
export type BinaryAsset = { id?: string; path: string; data: string };
export type DesignSnapshot = {
  id: string;
  name: string;
  at: number;
  pinned?: boolean;
  layers: Layer[];
  assets?: BinaryAsset[];
  layoutGuide?: Project["layoutGuide"];
  target?: string;
  deviceSize?: string;
};
export type Project = {
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  codeProvenance?: CodeProvenance;
  storageVersion?: number;
  target?: string;
  deviceSize?: string;
  id: string;
  appId: string;
  name: string;
  updated: number;
  revision: number;
  layers: Layer[];
  files: CodeFile[];
  assets?: BinaryAsset[];
  designSnapshots?: DesignSnapshot[];
  activeDesignSnapshot?: string;
  referenceId?: string;
  layoutGuide?: {
    presetId: string;
    safeInsetPx: number;
    minFontPx: number;
    numberFontPx: number;
    showGuide: boolean;
  };
  codeRevision: number;
  versions: CodeVersion[];
  activeCodeVersion?: string;
};
export type Profile = {
  provider?: string;
  thinking?: boolean;
  temperatureMode?: "auto" | "send" | "omit";
  tokenParameter?: "auto" | "max_tokens" | "max_completion_tokens";
  modelParameters?: Record<string, string[]>;
  id: string;
  name: string;
  url: string;
  model: string;
  key: string;
  remember: boolean;
  temperature: number;
  tokens: number;
};
export const uid = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
export const metrics: Record<string, string> = {
  heartRate: "心率",
  steps: "步数",
  battery: "电量",
  calories: "热量",
  distance: "当日距离",
  temperature: "温度",
  seconds: "秒数",
  stress: "压力",
  recoveryHours: "恢复时间",
  floorsClimbed: "楼层",
  intensityMinutes: "强度分钟",
  humidity: "湿度",
  uvIndex: "紫外线",
  altitude: "海拔",
  windSpeed: "风速",
};
export function layer(kind: Kind): Layer {
  return {
    id: uid(),
    name: {
      time: "时间",
      date: "日期",
      metric: "数据",
      text: "文字",
      image: "图片",
      ring: "秒环",
      rect: "矩形",
      circle: "圆形",
      line: "直线",
    }[kind],
    kind,
    x: 140,
    y: 180,
    w: 150,
    h: 50,
    color: "#45d6be",
    size: 28,
    rotation: 0,
    hidden: false,
    locked: false,
    text: kind === "text" ? "HELLO WORLD" : "",
    source: "heartRate",
    aod: kind === "time",
    threshold: kind === "metric",
  };
}
export function project(name = "极夜 01", blank = false): Project {
  const layers: Layer[] = blank
    ? []
    : [
        { ...layer("ring"), x: 8, y: 8, w: 438, h: 438 },
        {
          ...layer("time"),
          x: 55,
          y: 163,
          w: 344,
          h: 108,
          size: 87,
          color: "#ffffff",
        },
        {
          ...layer("date"),
          x: 147,
          y: 276,
          w: 160,
          h: 30,
          size: 22,
          color: "#b9c4d0",
        },
        {
          ...layer("metric"),
          name: "心率",
          x: 96,
          y: 337,
          w: 100,
          h: 45,
          size: 30,
        },
        {
          ...layer("metric"),
          name: "步数",
          x: 260,
          y: 337,
          w: 110,
          h: 45,
          size: 30,
          source: "steps",
          threshold: false,
        },
        {
          ...layer("metric"),
          name: "电量",
          x: 180,
          y: 78,
          w: 100,
          h: 35,
          size: 22,
          source: "battery",
        },
      ];
  return {
    schemaVersion: 12,
    id: uid(),
    appId: uid().replaceAll("-", ""),
    name,
    updated: Date.now(),
    revision: 0,
    layers,
    files: [],
    codeRevision: -1,
    versions: [],
  };
}
export function validateProject(value: unknown): Project {
  const p = migrateProject(value);
  const kinds = [
    "time",
    "date",
    "metric",
    "text",
    "image",
    "ring",
    "rect",
    "circle",
    "line",
  ];
  if (
    !p ||
    p.schemaVersion !== 12 ||
    typeof p.name !== "string" ||
    !Array.isArray(p.layers) ||
    p.layers.length > 200
  )
    throw Error("项目格式不正确或图层超过 200 个");
  if (
    p.assets &&
    (!Array.isArray(p.assets) ||
      p.assets.length > 80 ||
      p.assets.some(
        (a) =>
          !/^(resources|assets)\/[\w/-]+\.(png|jpg|jpeg)$/.test(a.path) ||
          a.path.includes("..") ||
          !/^data:image\/(png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(a.data) ||
          a.data.length > 12000000,
      ))
  )
    throw Error("素材格式无效");
  if (
    p.target &&
    !devices.some(
      (d) => d.id === p.target && (!p.deviceSize || p.deviceSize === d.size),
    )
  )
    throw Error("设备型号无效");
  if (
    p.layoutGuide &&
    (!Number.isFinite(p.layoutGuide.safeInsetPx) ||
      p.layoutGuide.safeInsetPx < 0 ||
      p.layoutGuide.safeInsetPx > 40 ||
      !Number.isFinite(p.layoutGuide.minFontPx) ||
      !Number.isFinite(p.layoutGuide.numberFontPx) ||
      !["basic", "large-time", "fitness", "blank"].includes(
        p.layoutGuide.presetId,
      ) ||
      typeof p.layoutGuide.showGuide !== "boolean")
  )
    throw Error("布局指导参数无效");
  for (const l of p.layers) {
    if (
      l.strokeWidth !== undefined &&
      (!Number.isFinite(l.strokeWidth) ||
        l.strokeWidth < 1 ||
        l.strokeWidth > 32)
    )
      throw Error("线宽无效");
    if (
      !kinds.includes(l.kind) ||
      typeof l.name !== "string" ||
      typeof l.text !== "string" ||
      typeof l.source !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(l.color) ||
      !["x", "y", "w", "h", "size", "rotation"].every((k) =>
        Number.isFinite(l[k as keyof Layer]),
      )
    )
      throw Error("图层属性无效");
    if (l.w <= 0 || l.h <= 0 || l.size < 1 || l.size > 200)
      throw Error("图层尺寸无效");
    if (
      (l.timePart !== undefined &&
        !["full", "hours", "minutes"].includes(l.timePart)) ||
      (l.textAlign !== undefined &&
        !["left", "center", "right"].includes(l.textAlign)) ||
      (l.fontWeight !== undefined && ![400, 600, 700].includes(l.fontWeight)) ||
      (l.garminFont !== undefined &&
        !["auto", "tiny", "small", "medium", "large", "numberHot"].includes(
          l.garminFont,
        )) ||
      (l.precision !== undefined &&
        (!Number.isInteger(l.precision) || l.precision < 0 || l.precision > 3))
    )
      throw Error("文字或数据格式无效");
    if (
      [l.fillEnabled, l.strokeEnabled].some(
        (v) => v !== undefined && typeof v !== "boolean",
      ) ||
      (l.strokeColor !== undefined && !/^#[0-9a-f]{6}$/i.test(l.strokeColor)) ||
      (l.opacity !== undefined &&
        (!Number.isFinite(l.opacity) || l.opacity < 0 || l.opacity > 1)) ||
      (l.cornerRadius !== undefined &&
        (!Number.isFinite(l.cornerRadius) ||
          l.cornerRadius < 0 ||
          l.cornerRadius > 500))
    )
      throw Error("形状样式无效");
    if (
      (l.anchor !== undefined &&
        ![
          "topLeft",
          "center",
          "topRight",
          "bottomLeft",
          "bottomRight",
        ].includes(l.anchor)) ||
      [l.exportIncluded, l.guide].some(
        (v) => v !== undefined && typeof v !== "boolean",
      )
    )
      throw Error("锚点或导出条件无效");
    if (
      (l.groupId !== undefined && !/^[a-zA-Z0-9_-]{1,120}$/.test(l.groupId)) ||
      (l.groupName !== undefined &&
        (typeof l.groupName !== "string" || l.groupName.length > 80))
    )
      throw Error("分组信息无效");
    if (l.thresholdRules)
      validateThresholds(l.thresholdRules, l.thresholdFallback || l.color);
    for (const color of [l.aodColor, l.thresholdFallback])
      if (color !== undefined && !/^#[0-9a-f]{6}$/i.test(color))
        throw Error("颜色设置无效");
    if (
      (l.ringTicks !== undefined &&
        (!Number.isInteger(l.ringTicks) ||
          l.ringTicks < 4 ||
          l.ringTicks > 180)) ||
      (l.ringWidth !== undefined &&
        (!Number.isFinite(l.ringWidth) ||
          l.ringWidth < 1 ||
          l.ringWidth > 32)) ||
      (l.ringGoal !== undefined &&
        (!Number.isFinite(l.ringGoal) || l.ringGoal <= 0)) ||
      (l.ringDim !== undefined &&
        (!Number.isFinite(l.ringDim) || l.ringDim < 0 || l.ringDim > 1)) ||
      (l.aodSize !== undefined &&
        (!Number.isFinite(l.aodSize) || l.aodSize < 1 || l.aodSize > 200))
    )
      throw Error("圆环或息屏尺寸无效");
    if (
      [l.ringStart, l.ringEnd].some(
        (v) => v !== undefined && (!Number.isFinite(v) || Math.abs(v) > 360),
      ) ||
      Math.abs((l.ringEnd ?? 360) - (l.ringStart ?? 0)) > 360
    )
      throw Error("圆环角度无效");
    if (
      (l.ringSource !== undefined &&
        !["seconds", "steps", "battery", "heartRate", "static"].includes(
          l.ringSource,
        )) ||
      (l.aodSeconds !== undefined && !["hide", "zero"].includes(l.aodSeconds))
    )
      throw Error("圆环或息屏策略无效");
    if (l.allowClip !== undefined && typeof l.allowClip !== "boolean")
      throw Error("裁切设置无效");
    for (const field of [l.label, l.unit, l.missingValue])
      if (
        field !== undefined &&
        (typeof field !== "string" || field.length > 100)
      )
        throw Error("标签、单位或缺失值格式无效");
    if (l.assetId !== undefined && !/^[a-zA-Z0-9_-]{1,120}$/.test(l.assetId))
      throw Error("图片素材标识无效");
    if (
      l.libraryIcon &&
      (l.kind !== "image" ||
        !/^[a-z0-9_]{1,120}$/.test(l.libraryIcon.id) ||
        typeof l.libraryIcon.recolor !== "boolean" ||
        !Number.isFinite(l.libraryIcon.strokeWidth) ||
        l.libraryIcon.strokeWidth < 0.5 ||
        l.libraryIcon.strokeWidth > 8)
    )
      throw Error("素材库参数无效");
    if (
      l.weatherIcon &&
      (!l.libraryIcon?.id.startsWith("meteocons_0_1_0_monochrome_") ||
        !["day", "night"].includes(l.weatherIcon.period))
    )
      throw Error("动态天气图标配置无效");
    if (l.image && !/^data:image\/(png|jpeg|webp);base64,/.test(l.image))
      throw Error("图片必须包含在项目中");
  }
  return {
    ...p,
    storageVersion: 0,
    activeCodeVersion: undefined,
    designSnapshots: [],
    activeDesignSnapshot: undefined,
    id: uid(),
    appId: uid().replaceAll("-", ""),
    files: [],
    codeRevision: -1,
    versions: [],
    revision: 0,
    updated: Date.now(),
    layers: p.layers.map((l) => ({
      ...l,
      ...(l.image
        ? {
            assetId:
              l.assetId || (/^[a-zA-Z0-9_-]{1,120}$/.test(l.id) ? l.id : uid()),
          }
        : {}),
      id: uid(),
    })),
  };
}
export function parseFiles(text: string): CodeFile[] {
  const trimmed = text.trim();
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    // Only accept a single complete JSON code fence; never guess braces from prose.
    const fences = [...trimmed.matchAll(/```([^\r\n`]*)\r?\n([\s\S]*?)```/g)];
    if (
      fences.length !== 1 ||
      !["", "json"].includes(fences[0][1].trim().toLowerCase()) ||
      trimmed.replace(fences[0][0], "").includes("```")
    ) {
      throw Error(
        "返回内容不是有效 JSON，或包含多个/不完整的代码围栏，请查看原始返回。",
      );
    }
    data = JSON.parse(fences[0][2]);
  }
  if (!data || typeof data !== "object" || !("files" in data))
    throw Error("模型需要返回包含 files 的 JSON 对象");
  const result = data as { files: CodeFile[] };
  if (
    !Array.isArray(result.files) ||
    !result.files.length ||
    result.files.length > 80
  )
    throw Error("模型需要返回非空 files 列表");
  const seen = new Set<string>();
  for (const f of result.files) {
    if (
      typeof f.path !== "string" ||
      typeof f.content !== "string" ||
      f.content.length > 1_000_000 ||
      f.path.length > 160 ||
      !/^(source\/[\w/-]+\.mc|resources\/[\w/-]+\.(?:xml|svg|fnt)|manifest\.xml|monkey\.jungle)$/.test(
        f.path,
      ) ||
      f.path.includes("..") ||
      seen.has(f.path.toLowerCase())
    )
      throw Error("模型返回了重复或不允许的文件路径");
    seen.add(f.path.toLowerCase());
  }
  for (const path of ["manifest.xml", "monkey.jungle"])
    if (!seen.has(path)) throw Error("缺少工程文件 " + path);
  if (
    !result.files.some(
      (f) => f.path.startsWith("source/") && f.path.endsWith(".mc"),
    )
  )
    throw Error("缺少 Monkey C 源文件");
  return result.files;
}
