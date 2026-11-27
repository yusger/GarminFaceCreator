import {validPolygon} from "./geometry";
import {createKinds,designCapabilityContext} from "./capabilities";
import { layoutTemplate } from "./layoutTemplates";
import { designSourceUnit } from "./generationRequirements";
import {
  layer,
  project,
  validateProject,
  metrics,
  uid,
  type Layer,
  type Project,
} from "./domain";
import { generationDevice } from "./devices";
import { crossesScreen } from "./bounds";
export type DesignStyle = "DIGITAL" | "ANALOG" | "HYBRID";
export type DesignReference = {
  id: string;
  name: string;
  data: string;
  usage: "style" | "layout" | "asset";
};
export type DesignChoices = {
  name: string;
  target: string;
  deviceSize: string;
  style: DesignStyle;
  seconds: boolean;
  date: boolean;
  dateLocale: "en" | "zh";
  sources: string[];
  instruction: string;
  layoutTemplateId?: string;
  backgroundPreference?: {mode:"solid"|"image";color:string};
};
export const designSources = Object.entries(metrics).filter(
  ([id]) => id !== "seconds",
);
const kinds = createKinds;
export const designFields = [
  "id",
  "name",
  "kind",
  "x",
  "y",
  "w",
  "h",
  "color",
  "size",
  "rotation",
  "polygonPoints",
  "text",
  "source",
  "activeVisible",
  "aod",
  "aodColor",
  "aodSize",
  "aodSeconds",
  "opacity",
  "textAlign",
  "fontWeight",
  "garminFont",
  "timePart",
  "dateLocale",
  "dateFormat",
  "label",
  "unit",
  "precision",
  "groupThousands",
  "missingValue",
  "threshold",
  "thresholdRules",
  "thresholdFallback",
  "meterContinuous",
  "meterDimColor",
  "meterShape",
  "meterCount",
  "meterGoal",
  "meterDim",
  "ringStyle",
  "ringCap",
  "ringTicks",
  "ringStart",
  "ringEnd",
  "ringWidth",
  "ringSource",
  "ringGoal",
  "ringDim",
  "handType",
  "handPivotX",
  "handPivotY",
  "handReach",
  "handTail",
  "handCap",
  "handShape",
  "strokeWidth",
  "fillEnabled",
  "strokeEnabled",
  "strokeColor",
  "cornerRadius",
  "allowClip",
  "groupId",
  "groupName",
  "effectPrompt",
  "referenceId",
] as const;
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validateDesignChoices(
  c: DesignChoices,
  refs: DesignReference[],
) {
  if (
    !c.name.trim() ||
    c.name.length > 80 ||
    !["DIGITAL", "ANALOG", "HYBRID"].includes(c.style) ||
    !["en", "zh"].includes(c.dateLocale) ||
    typeof c.seconds !== "boolean" ||
    typeof c.date !== "boolean" ||
    c.instruction.length > 4000 ||
    c.sources.length > designSources.length ||
    new Set(c.sources).size !== c.sources.length ||
    c.sources.some((s) => !designSources.some(([id]) => id === s))
  )
    throw Error("请检查项目名称、时间选项、数据项和提示词");
  if (c.layoutTemplateId && !layoutTemplate(c.layoutTemplateId)) throw Error("布局模板不存在");
  if (c.backgroundPreference && (!["solid","image"].includes(c.backgroundPreference.mode)||!/^#[a-fA-F0-9]{6}$/.test(c.backgroundPreference.color))) throw Error("背景选项无效");
  generationDevice(c);
  if (
    refs.length > 3 ||
    new Set(refs.map((r) => r.id)).size !== refs.length ||
    refs.reduce((n, r) => n + r.data.length, 0) > 12_000_000 ||
    refs.some(
      (r) =>
        !/^[a-zA-Z0-9_-]{1,100}$/.test(r.id) ||
        !["style", "layout", "asset"].includes(r.usage) ||
        !/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(r.data),
    )
  )
    throw Error("参考图最多3张，总量过大或图片格式无效");
}
export function designPayload(c: DesignChoices, refs: DesignReference[]) {
  validateDesignChoices(c, refs);
  return {
    protocol: "gfc-ai-design-v1",
    capabilities:designCapabilityContext(),
    basicSpecVersion: "1.1",
    device: generationDevice(c),
    coordinateSystem: {
      width: 454,
      height: 454,
      shape: "circle",
      safeInset: 12,
    },
    choices: c,
    layoutTemplate: c.layoutTemplateId ? (()=>{const t=layoutTemplate(c.layoutTemplateId)!;return {id:t.id,version:t.version,mode:t.mode,backgroundColor:t.backgroundColor,layers:t.layers,policy:"Use as editable composition guidance; current selected sources/time style override template defaults. Do not add unselected data."};})() : undefined,
    dataSources: c.sources.map((source) => ({
      source,
      label: metrics[source],
      unit: designSourceUnit(source),
      missing: "--",
      precision: source === "distance" ? 2 : source === "temperature" ? 1 : 0,
    })),
    references: refs.map(({ id, name, usage }) => ({ id, name, usage })),
    contract: {
      kinds,
      allowedLayerFields: designFields,
      maxLayers: 80,
      timeFormats: ["full", "hours", "minutes", "seconds"],
      clock: "24h device local",
      meterSources: ["steps", "battery"],
      ringSources: ["seconds", "steps", "battery", "heartRate", "static"],
      fonts: [
        "auto",
        "xtiny",
        "systemXTiny",
        "tiny",
        "small",
        "medium",
        "large",
        "numberHot",
      ],
      geometry: {
        positiveWidthAndHeight: true,
        polygonPoints:"polygon only, 3..32 strictly convex normalized [0,1] pairs, no crossing/duplicate/collinear vertices",
        maxWidthAndHeight: 908,
        coordinateRange: [-454, 908],
        fontSize: [1, 200],
        rotation: [-360, 360],
      },
      noNativeFiles: true,
    },
  };
}
export function parseDesign(
  raw: string,
  c: DesignChoices,
  refs: DesignReference[],
): Project {
  validateDesignChoices(c, refs);
  if (raw.length > 300_000) throw Error("设计响应过大，请简化设计");
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(raw.trim());
  const data = JSON.parse(fenced ? fenced[1] : raw);
  if (
    !object(data) ||
    Object.keys(data).some((k) => !["backgroundColor", "layers"].includes(k)) ||
    !/^#[0-9a-f]{6}$/i.test(data.backgroundColor) ||
    !Array.isArray(data.layers) ||
    !data.layers.length ||
    data.layers.length > 80
  )
    throw Error(
      "模型须返回backgroundColor与1–80个独立layers，不能返回工程文件或整盘截图",
    );
  const result = project(c.name.trim(), true);
  result.target = c.target;
  result.deviceSize = c.deviceSize;
  result.backgroundColor = data.backgroundColor;
  result.designBrief = JSON.stringify({
    basicSpecVersion: "1.1",
    style: c.style,
    seconds: c.seconds,
    date: c.date,
    dateLocale: c.dateLocale,
    sources: c.sources,
    instruction: c.instruction,
    layoutTemplate: c.layoutTemplateId?{id:c.layoutTemplateId,version:layoutTemplate(c.layoutTemplateId)!.version}:undefined,
    backgroundPreference:c.backgroundPreference,
    references: refs.map(({ id, name, usage }) => ({ id, name, usage })),
  });
  const ids = new Set<string>();
  result.layers = data.layers.map((v: unknown) => {
    if (
      !object(v) ||
      Object.keys(v).some(
        (k) => !(designFields as readonly string[]).includes(k),
      ) ||
      !kinds.includes(v.kind) ||
      typeof v.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(v.id) ||
      ids.has(v.id) ||
      typeof v.name !== "string" ||
      !v.name.trim() ||
      v.name.length > 80 ||
      !["x", "y", "w", "h", "size"].every((k) => Number.isFinite(v[k])) ||
      typeof v.aod !== "boolean" ||
      !/^#[0-9a-f]{6}$/i.test(v.color)
    )
      throw Error("图层字段、类型、唯一ID或几何不完整，请重试或调整要求");
    if (
      v.x < -454 ||
      v.y < -454 ||
      v.x > 908 ||
      v.y > 908 ||
      v.w < 1 ||
      v.h < 1 ||
      v.w > 908 ||
      v.h > 908 ||
      Math.abs(v.rotation ?? 0) > 360
    )
      throw Error("设计几何超出允许范围");
    ids.add(v.id);
    for (const [k, value] of Object.entries(v)) {
      if (k === "thresholdRules") continue;
      if(k === "polygonPoints"){if(!validPolygon(value))throw Error("AI多边形无效");continue;}
      if (
        !["string", "number", "boolean"].includes(typeof value) ||
        (typeof value === "number" && !Number.isFinite(value))
      )
        throw Error("设计字段必须是有效标量");
    }
    if (
      v.garminFont &&
      ![
        "auto",
        "xtiny",
        "systemXTiny",
        "tiny",
        "small",
        "medium",
        "large",
        "numberHot",
      ].includes(v.garminFont)
    )
      throw Error("首版AI设计请使用内置字体");
    for (const key of [
      "aod",
      "activeVisible",
      "threshold",
      "meterContinuous",
      "groupThousands",
      "fillEnabled",
      "strokeEnabled",
      "allowClip",
    ])
      if (v[key] !== undefined && typeof v[key] !== "boolean")
        throw Error("图层开关必须为boolean");
    if (
      v.thresholdRules !== undefined &&
      (!Array.isArray(v.thresholdRules) ||
        v.thresholdRules.some(
          (r: unknown) =>
            !object(r) ||
            Object.keys(r).some((k) => !["min", "max", "color"].includes(k)),
        ))
    )
      throw Error("阈值规则只允许min/max/color");
    if (v.aod && !/^#[0-9a-f]{6}$/i.test(v.aodColor))
      throw Error("息屏保留层须声明低亮度颜色");
    if (
      v.effectPrompt !== undefined &&
      (typeof v.effectPrompt !== "string" || v.effectPrompt.length > 2000)
    )
      throw Error("控件效果说明最多2000字");
    if (
      ["metric", "meter"].includes(v.kind) &&
      (!c.sources.includes(v.source) || typeof v.source !== "string")
    )
      throw Error("模型使用了未勾选或未绑定的数据源");
    if (v.kind === "meter" && !["steps", "battery"].includes(v.source))
      throw Error("当前进度控件仅支持步数和电量");
    if (
      v.kind === "ring" &&
      (v.ringSource === undefined ||
        ![
          "seconds",
          "static",
          ...c.sources.filter((s) =>
            ["steps", "battery", "heartRate"].includes(s),
          ),
        ].includes(v.ringSource))
    )
      throw Error("秒环/进度环来源不符合选择");
    if (
      v.kind === "time" &&
      !["full", "hours", "minutes", "seconds"].includes(v.timePart)
    )
      throw Error("时间须明确full/hours/minutes/seconds");
    if (v.kind === "hand" && !["hour", "minute", "second"].includes(v.handType))
      throw Error("指针须明确时/分/秒");
    if (v.kind === "date" && (!c.date || v.dateLocale !== c.dateLocale))
      throw Error("日期显示与所选语言不一致");
    if (
      v.dateFormat !== undefined &&
      (v.dateFormat !== "monthDayWeek" ||
        (v.kind === "date" && v.dateLocale === "zh"))
    )
      throw Error("日期格式与当前语言不兼容");
    if (
      v.kind === "metric" &&
      v.unit !== undefined &&
      v.unit !== "" &&
      v.unit !== designSourceUnit(v.source)
    )
      throw Error(
        "数据单位与实际来源不符：" +
          v.source +
          "应使用" +
          designSourceUnit(v.source),
      );
    const { referenceId, ...fields } = v;
    const item: Layer = {
      ...layer(v.kind),
      threshold: false,
      metricDecoration: false,
      ...fields,
      hidden: false,
      locked: false,
      exportIncluded: true,
    };
    if (item.kind === "image") {
      const r = refs.find((r) => r.id === referenceId && r.usage === "asset");
      if (!r) throw Error("图片图层只能引用标为实际素材的本地参考图");
      item.image = r.data;
      item.assetId = "ai_" + r.id;
      item.imageFullColor = true;
    } else if (referenceId !== undefined)
      throw Error("referenceId仅用于图片层");
    if (["time", "date", "metric"].includes(item.kind) && item.allowClip)
      throw Error("重要数据不能声明允许裁切");
    if (crossesScreen(item))
      throw Error("图层“" + item.name + "”越出圆屏，请调整要求后重新生成");
    return item;
  });
  const active = result.layers.filter((l) => l.activeVisible !== false);
  const timed = active.filter((l) => l.kind === "time");
  const digital =
    timed.some((l) => l.timePart === "full") ||
    (timed.some((l) => l.timePart === "hours") &&
      timed.some((l) => l.timePart === "minutes"));
  const analog = ["hour", "minute"].every((part) =>
    active.some((l) => l.kind === "hand" && l.handType === part),
  );
  if (
    (c.style !== "ANALOG" && !digital) ||
    (c.style !== "DIGITAL" && !analog) ||
    (c.style === "DIGITAL" && active.some((l) => l.kind === "hand")) ||
    (c.style === "ANALOG" && digital)
  )
    throw Error("生成的时间模块不符合所选数字/指针/混合风格");
  if (
    result.layers.some(
      (l) =>
        l.aod &&
        ((l.kind === "time" && l.timePart === "seconds") ||
          (l.kind === "hand" && l.handType === "second") ||
          (l.kind === "ring" && l.ringSource === "seconds")),
    )
  )
    throw Error("AI创建的秒数和秒环应在AOD隐藏");
  const low = active.filter((l) => l.aod);
  if (
    c.style !== "ANALOG" &&
    !(
      low.some((l) => l.kind === "time" && l.timePart === "full") ||
      ["hours", "minutes"].every((part) =>
        low.some((l) => l.kind === "time" && l.timePart === part),
      )
    )
  )
    throw Error("息屏缺少数字时分");
  if (
    c.style !== "DIGITAL" &&
    !["hour", "minute"].every((part) =>
      low.some((l) => l.kind === "hand" && l.handType === part),
    )
  )
    throw Error("息屏缺少时针或分针");
  const seconds = active.some(
    (l) =>
      (l.kind === "time" && l.timePart === "seconds") ||
      (l.kind === "hand" && l.handType === "second") ||
      (l.kind === "ring" && l.ringSource === "seconds"),
  );
  if (
    seconds !== c.seconds ||
    (!c.seconds &&
      result.layers.some(
        (l) =>
          (l.kind === "time" && l.timePart === "seconds") ||
          (l.kind === "hand" && l.handType === "second") ||
          (l.kind === "ring" && l.ringSource === "seconds"),
      ))
  )
    throw Error("秒数开关与生成设计不一致");
  if (c.date !== active.some((l) => l.kind === "date"))
    throw Error("日期开关与生成设计不一致");
  for (const src of c.sources)
    if (
      !active.some(
        (l) =>
          (["metric", "meter"].includes(l.kind) && l.source === src) ||
          (l.kind === "ring" && l.ringSource === src),
      )
    )
      throw Error("模型遗漏了勾选的数据：" + metrics[src]);
  // Imported data is validated and assigned fresh project/application/layer identities; no model code survives.
  const validated = validateProject(result);
  validated.referenceId = undefined;
  return validated;
}
export async function readDesignReference(
  file: File,
): Promise<DesignReference> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 4 * 1024 * 1024
  )
    throw Error("参考图须为PNG/JPEG/WebP，每张不超过4MB");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16_000_000)
      throw Error("参考图分辨率过大，请先缩小");
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      id: "ref_" + uid().replaceAll("-", ""),
      name: file.name,
      data: canvas.toDataURL("image/png"),
      usage: "style",
    };
  } finally {
    bitmap.close();
  }
}
