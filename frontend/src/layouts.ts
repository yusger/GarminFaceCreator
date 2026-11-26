import { applyTemplate } from "./layoutTemplates";
import { applyBackground, type BackgroundChoice } from "./background";
﻿import { layer, project as newProject, type Project } from "./domain.ts";
import { deviceFor } from "./devices.ts";
export const layoutPresets = [
  { id: "basic", name: "基础数字" },
  { id: "large-time", name: "大字时间" },
  { id: "fitness", name: "运动数据" },
  { id: "blank", name: "空白画布" },
] as const;
export type LayoutChoice = {
  presetId: string;
  background?: BackgroundChoice;
  safeInsetPx: number;
  minFontPx: number;
  numberFontPx: number;
  showGuide: boolean;
};
export function suggestedLayout(
  device: { pixels: number },
  presetId = "basic",
): LayoutChoice {
  return {
    presetId,
    safeInsetPx: Math.round(device.pixels * 0.045),
    minFontPx: 14,
    numberFontPx: 64,
    showGuide: true,
  };
}
export function applyLayout(p: Project, choice: LayoutChoice): Project {
  if (choice.presetId.startsWith("template:")) p = applyTemplate(p, choice.presetId.slice(9));
  const device = deviceFor(p),
    timeSize = Math.max(87, Math.ceil((75 * 454) / device.pixels));
  let layers = choice.presetId === "blank" ? [] : p.layers;
  if (choice.presetId === "large-time")
    layers = [
      {
        ...layer("time"),
        x: 57,
        y: 165,
        w: 340,
        h: 100,
        size: Math.max(96, timeSize),
        color: "#ffffff",
      },
      { ...layer("date"), x: 117, y: 275, w: 220, h: 34, size: 24, aod: true },
      {
        ...layer("metric"),
        name: "电量",
        source: "battery",
        x: 167,
        y: 325,
        w: 120,
        h: 38,
        size: 24,
      },
    ];
  else if (choice.presetId === "fitness")
    layers = [
      {
        ...layer("time"),
        x: 67,
        y: 120,
        w: 320,
        h: 90,
        size: timeSize,
        color: "#ffffff",
      },
      { ...layer("date"), x: 117, y: 75, w: 220, h: 32, size: 24 },
      {
        ...layer("metric"),
        name: "心率",
        x: 72,
        y: 240,
        w: 140,
        h: 50,
        size: 30,
      },
      {
        ...layer("metric"),
        name: "步数",
        source: "steps",
        threshold: false,
        x: 242,
        y: 240,
        w: 140,
        h: 50,
        size: 30,
      },
      {
        ...layer("metric"),
        name: "电量",
        source: "battery",
        x: 157,
        y: 320,
        w: 140,
        h: 40,
        size: 26,
      },
    ];
  else if (choice.presetId === "basic")
    layers = (layers.length ? layers : newProject(p.name).layers).map((l) =>
      l.kind === "time"
        ? { ...l, size: Math.max(l.size, timeSize) }
        : l.kind === "metric" && l.y > 300
          ? { ...l, y: 320, h: 40 }
          : l,
    );
  const inset = Math.max(0, Math.min(40, choice.safeInsetPx)),
    factor = Math.min(1, (227 - (inset * 454) / device.pixels) / 207);
  layers = layers.map((l) =>
    l.kind === "ring"
      ? l
      : {
          ...l,
          x: 227 + (l.x - 227) * factor,
          y: 227 + (l.y - 227) * factor,
          w: l.w * factor,
          h: l.h * factor,
          size: l.size * factor,
        },
  );
  const {background,...guide}=choice;
  return applyBackground({...p,layers,layoutGuide:{...guide,safeInsetPx:inset},updated:Date.now()},background);
}
export function guideInsetDesign(p: Project) {
  return ((p.layoutGuide?.safeInsetPx ?? 20) * 454) / deviceFor(p).pixels;
}
