import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { project, layer } from "../frontend/src/domain.ts";
const root = "frontend/public/pulsemaniac/";
await mkdir(root, { recursive: true });
let randomSeed = 731;
const random = () => {
  randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
  return randomSeed / 4294967296;
};
let grain = "";
for (let i = 0; i < 1100; i++) {
  const x = (random() * 454).toFixed(2),
    y = (random() * 454).toFixed(2),
    r = (random() * 0.55 + 0.12).toFixed(2);
  grain += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 3 ? "#262b32" : "#0b1015"}" opacity=".5"/>`;
}
let ticks = "";
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6 - Math.PI / 2;
  ticks += `<path d="M${(227 + Math.cos(a) * 204).toFixed(2)} ${(227 + Math.sin(a) * 204).toFixed(2)}L${(227 + Math.cos(a) * 215).toFixed(2)} ${(227 + Math.sin(a) * 215).toFixed(2)}" stroke-width="3.3"/>`;
}
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="454" height="454" viewBox="0 0 454 454"><rect width="454" height="454" fill="#14181f"/>${grain}<g fill="none" stroke="#e8ecf1" stroke-linecap="round"><path d="M227 12C346 11 442 109 442 227C443 345 346 441 227 442C108 441 12 345 12 227C11 108 108 13 227 12" stroke-width="1.8"/><path d="M227 15C345 14 439 111 439 227C440 344 344 438 227 439C111 438 15 344 15 227C14 111 111 16 227 15" stroke-width=".7" opacity=".6"/>${ticks}<path d="M139 309Q177 300 224 306T315 309M153 311Q185 306 219 309" stroke-width="1.6" opacity=".6"/></g></svg>`;
await writeFile(root + "background.svg", background);
const p = project("PulseManiac", true);
Object.assign(p, {
  id: "00000000-0000-4000-8000-000000000011",
  appId: "1c527eb2365e4be49e09ac95f70747d8",
  target: "venu445mm",
  deviceSize: "45mm",
  starterId: "pulsemaniac",
  updated: 0,
  layers: [],
});
let n = 0;
const add = (kind, props) => {
  const l = { ...layer(kind), id: "pulse-layer-" + ++n, ...props };
  p.layers.push(l);
  return l;
};
const imageAssets = [];
const bg = add("image", {
  name: "黑板背景与粉笔刻度",
  x: 0,
  y: 0,
  w: 454,
  h: 454,
  aod: false,
  locked: true,
  allowClip: true,
  assetId: "pulse-background-v1",
  groupId: "background",
  groupName: "共享背景",
});
imageAssets.push({ layerId: bg.id, path: "/pulsemaniac/background.svg" });
const states = [
  {
    key: "rest",
    name: "静息态",
    color: "#b8c0cc",
    condition: {
      source: "heartRate",
      max: 100,
      missingVisible: true,
      aod: "show",
    },
  },
  {
    key: "ready",
    name: "预备态",
    color: "#e8dfb5",
    condition: { source: "heartRate", min: 100, max: 120, aod: "hide" },
  },
  {
    key: "twist",
    name: "扭动态",
    color: "#ffc107",
    condition: {
      source: "heartRate",
      min: 120,
      max: 140,
      maxInclusive: true,
      aod: "hide",
    },
  },
  {
    key: "maniac",
    name: "彻底疯狂态",
    color: "#f44336",
    condition: {
      source: "heartRate",
      min: 140,
      minExclusive: true,
      aod: "hide",
    },
  },
];
for (const state of states) {
  const l = add("image", {
    name: state.name + "人物",
    x: 117,
    y: 104,
    w: 220,
    h: 220,
    assetId: "pulse-" + state.key + "-v1",
    aod: state.key === "rest",
    visibility: state.condition,
    groupId: state.key,
    groupName: state.name,
    allowClip: false,
  });
  imageAssets.push({
    layerId: l.id,
    path: "/pulsemaniac/" + state.key + ".png",
  });
}
// Shared anchor, independent heart icon and number. The artwork contains no baked-in data.
for (const state of states) {
  add("image", {
    name: state.name + "心形",
    x: 222,
    y: 193,
    w: 10,
    h: 10,
    color: state.color,
    aod: state.key === "rest",
    visibility: state.condition,
    libraryIcon: {
      id: "lucide_586bf5cf_heart_pulse",
      recolor: true,
      strokeWidth: 2.5,
    },
    groupId: state.key,
    groupName: state.name,
  });
  add("metric", {
    name: state.name + "胸口心率",
    x: 200,
    y: 205,
    w: 54,
    h: 32,
    size: 26,
    garminFont: "xtiny",
    source: "heartRate",
    metricDecoration: false,
    label: "",
    unit: "",
    precision: 0,
    missingValue: "--",
    threshold: false,
    color: state.color,
    aodColor: "#888888",
    aodSize: 26,
    aod: state.key === "rest",
    visibility: state.condition,
    groupId: state.key,
    groupName: state.name,
  });
}
for (const [text, x, y] of [
  ["彻", 58, 150],
  ["底", 362, 150],
  ["疯", 61, 266],
  ["狂", 359, 266],
])
  add("text", {
    name: "疯狂装饰 " + text,
    text,
    x,
    y,
    w: 34,
    h: 34,
    size: 26,
    garminFont: "systemXTiny",
    color: "#e8ecf1",
    aod: false,
    visibility: states[3].condition,
    groupId: "maniac",
    groupName: "彻底疯狂态",
  });
add("metric", {
  name: "顶部数据1（默认电量）",
  garminFont: "xtiny",
  x: 127,
  y: 47,
  w: 200,
  h: 28,
  size: 22,
  source: "battery",
  label: "BAT",
  unit: undefined,
  metricDecoration: false,
  precision: 0,
  threshold: false,
  color: "#e8ecf1",
  aod: false,
  groupId: "shared-data",
  groupName: "共享数据与时间",
});
add("metric", {
  name: "顶部数据2（默认步数）",
  garminFont: "xtiny",
  x: 127,
  y: 81,
  w: 200,
  h: 27,
  size: 20,
  source: "steps",
  label: "STEPS",
  unit: undefined,
  metricDecoration: false,
  precision: 0,
  threshold: false,
  color: "#c4cbd4",
  aod: false,
  groupId: "shared-data",
  groupName: "共享数据与时间",
});
add("date", {
  name: "人物下方日期",
  x: 102,
  y: 324,
  w: 250,
  h: 28,
  size: 20,
  dateLocale: "zh",
  garminFont: "systemXTiny",
  color: "#e8ecf1",
  aod: false,
  groupId: "shared-data",
  groupName: "共享数据与时间",
});
add("time", {
  name: "底部时间",
  garminFont: "large",
  x: 87,
  y: 352,
  w: 280,
  h: 66,
  size: 62,
  fontWeight: 700,
  color: "#e8ecf1",
  aodColor: "#888888",
  aodSize: 60,
  aod: true,
  groupId: "shared-data",
  groupName: "共享数据与时间",
});
for (const asset of imageAssets) {
  const bytes = await readFile("frontend/public" + asset.path);
  asset.sha256 = createHash("sha256").update(bytes).digest("hex");
}
await writeFile(
  root + "project.json",
  JSON.stringify({ format: 1, project: p, images: imageAssets }, null, 2) +
    "\n",
);
console.log(
  "PulseManiac:",
  p.layers.length,
  "editable layers;",
  imageAssets.length,
  "static assets",
);

await mkdir("frontend/public/reference-notices", { recursive: true });
for (const name of ["NOTICE.md", "PROMPTS.md"])
  await copyFile(
    root + name,
    "frontend/public/reference-notices/PulseManiac-" + name,
  );
