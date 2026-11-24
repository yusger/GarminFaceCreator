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
export type Layer = {
  id: string;
  name: string;
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
  aod: boolean;
  threshold: boolean;
  strokeWidth?: number;
};
export type CodeFile = { path: string; content: string };
export type Project = {
  schemaVersion: 1;
  target?: string;
  deviceSize?: string;
  id: string;
  appId: string;
  name: string;
  updated: number;
  revision: number;
  layers: Layer[];
  files: CodeFile[];
  assets?: { path: string; data: string }[];
  codeRevision: number;
  versions: { at: number; revision: number; files: CodeFile[] }[];
};
export type Profile = {
  provider?: string;
  thinking?: boolean;
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
    schemaVersion: 1,
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
  const p = value as Project;
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
    p.schemaVersion !== 1 ||
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
          !/^resources\/[\w/-]+\.(png|jpg|jpeg)$/.test(a.path) ||
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
    if (l.image && !/^data:image\/(png|jpeg|webp);base64,/.test(l.image))
      throw Error("图片必须包含在项目中");
  }
  return {
    ...p,
    id: uid(),
    appId: uid().replaceAll("-", ""),
    files: [],
    codeRevision: -1,
    versions: [],
    revision: 0,
    updated: Date.now(),
    layers: p.layers.map((l) => ({ ...l, id: uid() })),
  };
}
export function parseFiles(text: string): CodeFile[] {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const data = JSON.parse(clean);
  if (
    !Array.isArray(data.files) ||
    !data.files.length ||
    data.files.length > 80
  )
    throw Error("模型需要返回非空 files 列表");
  const seen = new Set<string>();
  for (const f of data.files) {
    if (
      typeof f.path !== "string" ||
      typeof f.content !== "string" ||
      f.content.length > 1_000_000 ||
      f.path.length > 160 ||
      !/^(source\/[\w/-]+\.mc|resources\/[\w/-]+\.(?:xml|svg|fnt)|manifest\.xml|monkey\.jungle)$/.test(
        f.path,
      ) ||
      f.path.includes("..") ||
      seen.has(f.path)
    )
      throw Error("模型返回了重复或不允许的文件路径");
    seen.add(f.path);
  }
  for (const path of ["manifest.xml", "monkey.jungle"])
    if (!seen.has(path)) throw Error("缺少工程文件 " + path);
  return data.files;
}
