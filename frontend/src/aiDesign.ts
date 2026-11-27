import {meterSources} from "./meters.ts";
import {chartSchema,validateChart} from "./charts";
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
export const designLooks={free:"自由设计",minimal_clean:"极简清晰",sport_data:"运动仪表",retro_digital:"复古数字"} as const;
export type DesignChoices = {
  look?:keyof typeof designLooks;
  complexity?:1|2|3|4;
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
  "chart",
  "name",
  "kind",
  "x",
  "y",
  "w",
  "h",
  "color",
  "size",
  "rotation",
  "arcRadius",
  "arcStartAngle",
  "arcDirection",
  "arcSpacing",
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
  "autoSourceFormat",
  "metricDecoration",
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

export type DesignIssue={index:number;layerId:string;field:string;code:string;message:string};
export class DesignValidationError extends Error {
 constructor(public issues:DesignIssue[]){super(issues.map(i=>`图层“${i.layerId}” ${i.field}：${i.message}`).join("\n"));this.name="DesignValidationError";}
}
const designBooleanFields=new Set(["activeVisible","aod","groupThousands","autoSourceFormat","metricDecoration","threshold","meterContinuous","fillEnabled","strokeEnabled","allowClip"]);
const designNumberFields=new Set(["x","y","w","h","size","rotation","arcRadius","arcStartAngle","arcSpacing","aodSize","opacity","fontWeight","precision","meterCount","meterGoal","meterDim","ringTicks","ringStart","ringEnd","ringWidth","ringGoal","ringDim","handPivotX","handPivotY","handReach","handTail","strokeWidth","cornerRadius"]);
export function layerInputIssues(value:unknown,index:number):DesignIssue[]{
 const id=object(value)&&typeof value.id==="string"?value.id:"#"+index,issues:DesignIssue[]=[];
 const add=(field:string,code:string,message:string)=>issues.push({index,layerId:id,field,code,message});
 if(!object(value)){add("layer","OBJECT_REQUIRED","必须为图层对象");return issues;}
 for(const field of ["id","name","kind","x","y","w","h","size","color","aod"])if(value[field]===undefined)add(field,"REQUIRED","缺少必需字段");
 for(const [field,v] of Object.entries(value)){
  if(!(designFields as readonly string[]).includes(field)){add(field,"UNKNOWN_FIELD","不在AI创建字段契约内");continue;}
  if(designBooleanFields.has(field)&&typeof v!=="boolean")add(field,"BOOLEAN_REQUIRED","必须为boolean");
  else if(designNumberFields.has(field)&&!Number.isFinite(v))add(field,"NUMBER_REQUIRED","必须为有限数值");
  else if(!designBooleanFields.has(field)&&!designNumberFields.has(field)&&!["chart","handShape","polygonPoints","thresholdRules"].includes(field)&&typeof v!=="string")add(field,"STRING_REQUIRED","必须为字符串");
 }
 if(value.chart!==undefined&&(!object(value.chart)||value.kind!=="chart"))add("chart","INVALID_CHART","图表配置须为chart对象");
 if(value.id!==undefined&&(typeof value.id!=="string"||!/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)))add("id","INVALID_ID","须为1–100个字母、数字、下划线或短横线");
 if(value.name!==undefined&&(typeof value.name!=="string"||!value.name.trim()||value.name.length>80))add("name","INVALID_NAME","名称须为1–80个字符");
 if(value.kind!==undefined&&!kinds.includes(value.kind))add("kind","UNSUPPORTED_KIND","不是已支持的控件类型");
 if(value.color!==undefined&&(typeof value.color!=="string"||!/^#[0-9a-f]{6}$/i.test(value.color)))add("color","INVALID_COLOR","颜色须为#RRGGBB");
 if(value.aod===true&&(typeof value.aodColor!=="string"||!/^#[0-9a-f]{6}$/i.test(value.aodColor)))add("aodColor","INVALID_AOD_COLOR","息屏保留层须声明#RRGGBB颜色");
 for(const field of ["x","y"])if(Number.isFinite(value[field])&&(value[field]<-454||value[field]>908))add(field,"GEOMETRY_RANGE","坐标超出允许范围");
 for(const field of ["w","h"])if(Number.isFinite(value[field])&&(value[field]<1||value[field]>908))add(field,"GEOMETRY_RANGE","尺寸须在1–908之间");
 if(Number.isFinite(value.size)&&(value.size<1||value.size>200))add("size","SIZE_RANGE","size须在1–200之间");
 if(value.handShape!==undefined){const shape=value.handShape;if(value.kind!=="hand"||!object(shape)||!/^[a-z][a-z0-9-]{0,79}$/.test(shape.id)||!/^\d+\.\d+\.\d+$/.test(shape.version)||!Array.isArray(shape.points)||shape.points.length<3||shape.points.length>32||shape.points.some((p:unknown)=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n< -1||n>1)))add("handShape","HAND_SHAPE_INVALID","普通直线指针请省略此字段；自定义轮廓须为合法{id,version,points}对象");}
 if(value.dateFormat!==undefined&&(!["monthDayWeek","weekdayDay"].includes(value.dateFormat)||value.kind!=="date"||value.dateLocale==="zh"))add("dateFormat","DATE_FORMAT_INVALID","日期格式仅英文可使用monthDayWeek/weekdayDay，中文日期请省略");
 return issues;
}

export function designBudget(c:Pick<DesignChoices,"complexity">){return [{maxLayers:12,maxRings:1,maxImages:2,maxShapes:4},{maxLayers:24,maxRings:2,maxImages:4,maxShapes:10},{maxLayers:40,maxRings:4,maxImages:8,maxShapes:18},{maxLayers:80,maxRings:8,maxImages:16,maxShapes:36}][(c.complexity??4)-1];}
export function designResponseSchema(c:DesignChoices){
 const properties:Record<string,any>=Object.fromEntries(designFields.map(k=>[k,designBooleanFields.has(k)?{type:"boolean"}:designNumberFields.has(k)?{type:"number"}:{type:"string"}]));
 const points=(min:number,max:number)=>({type:"array",minItems:3,maxItems:32,items:{type:"array",minItems:2,maxItems:2,items:{type:"number",minimum:min,maximum:max}}});
 Object.assign(properties,{
  id:{type:"string",pattern:"^[a-zA-Z0-9_-]{1,100}$"},name:{type:"string",minLength:1,maxLength:80},kind:{enum:kinds},
  color:{type:"string",pattern:"^#[0-9a-fA-F]{6}$"},size:{type:"number",minimum:1,maximum:200},w:{type:"number",minimum:1,maximum:908},h:{type:"number",minimum:1,maximum:908},opacity:{type:"number",minimum:0,maximum:1},
  source:c.sources.length?{enum:c.sources}:false,timePart:{enum:["full","hours","minutes",...(c.seconds?["seconds"]:[])]},garminFont:{enum:["auto","xtiny","systemXTiny","tiny","small","medium","large","numberHot"]},
  dateLocale:{enum:["en","zh"]},dateFormat:{enum:["monthDayWeek","weekdayDay"]},textAlign:{enum:["left","center","right"]},handType:{enum:["hour","minute",...(c.seconds?["second"]:[])]},handCap:{enum:["round","butt"]},ringStyle:{enum:["ticks","continuous"]},ringCap:{enum:["round","butt"]},ringSource:{enum:["static",...(c.seconds?["seconds"]:[]),...c.sources.filter(s=>["steps","battery","heartRate"].includes(s))]},
  thresholdRules:{type:"array",maxItems:16,items:{type:"object",additionalProperties:false,required:["color"],properties:{min:{type:"number"},max:{type:"number"},color:{type:"string",pattern:"^#[0-9a-fA-F]{6}$"}}}},
  polygonPoints:points(0,1),
  chart:chartSchema(),
  handShape:{type:"object",additionalProperties:false,required:["id","version","points"],properties:{id:{type:"string",pattern:"^[a-z][a-z0-9-]{0,79}$"},version:{type:"string",pattern:"^[0-9]+[.][0-9]+[.][0-9]+$"},points:points(-1,1)}}
 });
 return {$schema:"https://json-schema.org/draft/2020-12/schema",$id:"urn:gfc:ai-design-response:1",type:"object",additionalProperties:false,required:["backgroundColor","layers"],properties:{backgroundColor:{type:"string",pattern:"^#[0-9a-fA-F]{6}$"},layers:{type:"array",minItems:1,maxItems:designBudget(c).maxLayers,items:{type:"object",additionalProperties:false,required:["id","name","kind","x","y","w","h","size","color","aod"],properties,allOf:[{if:{properties:{kind:{const:"date"},dateLocale:{const:"zh"}},required:["kind","dateLocale"]},then:{not:{required:["dateFormat"]}}}]}}}};
}
export function normalizeDesignResponse(raw:string){
 const edits:{layerId:string;field:string;message:string}[]=[];
 try{if(raw.length>300000)return {raw,edits};const fenced=/^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(raw.trim()),data=JSON.parse(fenced?fenced[1]:raw);if(!object(data)||!Array.isArray(data.layers)||data.layers.length>80)return {raw,edits};
 for(const l of data.layers){if(!object(l))continue;if(l.size===undefined&&["rect","circle","line","polygon"].includes(l.kind)){l.size=layer(l.kind).size;edits.push({layerId:String(l.id||l.name),field:"size",message:"为基础形状补齐未用于绘制文字的默认size"});}if(l.kind==="hand"&&l.handShape==="line"){delete l.handShape;edits.push({layerId:String(l.id||l.name),field:"handShape",message:"直线指针使用默认轮廓，移除无效的line字符串"});}}
 return {raw:edits.length?JSON.stringify(data,null,2):raw,edits};}catch{return {raw,edits:[]};}
}

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
    (c.look!==undefined&&!Object.hasOwn(designLooks,c.look)) ||
    (c.complexity!==undefined&&![1,2,3,4].includes(c.complexity)) ||
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
      layerRules:{chart:"ONE chart object with nested chart configuration; unit day with steps/distance/calories or unit hour with heartRate only; length1..7; bar/trapezoid/segmented/line/area. Hour aggregation mean/max/min/last, no sum. Up to4 charts; real history nullable, browser demonstration only. ECG unsupported.",required:["id","name","kind","x","y","w","h","size","color","aod"],metricDecoration:"boolean; false for numeric-only readouts",dateFormat:"English date only: monthDayWeek or weekdayDay; omit for Chinese dates",handShape:"Ordinary line hands MUST omit handShape. Custom shape is an object {id,version,points}, never the string line",geometry:"Circle center227,227 radius227. Essential information must remain within the circular drawing area. For non-text rectangles all four corners must fit; for text allow for longest readings, font bounds and missing values. Decorations alone may intentionally allowClip. Array order is back-to-front; legal overlap includes backgrounds, ticks and hands."},
      maxLayers: designBudget(c).maxLayers,
      complexityBudget:designBudget(c),
      visualStyle:c.look||"free",
      visualStylePolicy:"Look is composition guidance, never permission to change selected DIGITAL/ANALOG/HYBRID time structure, omit selected data, upload hidden resources or invent new kinds. Minimal clean favors generous spacing, sport data compact aligned readings, retro digital uses supported numeric fonts. Current template remains the layout starting point.",
      responseSchema:designResponseSchema(c),
      timeFormats: ["full", "hours", "minutes", "seconds"],
      clock: "24h device local",
      meterSources,
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
        polygonPoints:"polygon only, 3..32 simple normalized [0,1] outline pairs; concave supported via bounded triangles; no holes/crossing/contact/duplicates or adjacent collinear vertices",
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
    data.layers.length > designBudget(c).maxLayers
  )
    throw Error(
      "模型须返回backgroundColor与当前复杂度允许数量内的独立layers，不能返回工程文件或整盘截图",
    );
  const result = project(c.name.trim(), true);
  result.target = c.target;
  result.deviceSize = c.deviceSize;
  result.backgroundColor = data.backgroundColor;
  result.designBrief = JSON.stringify({
    basicSpecVersion: "1.1",
    style: c.style,
    look:c.look,complexity:c.complexity,
    seconds: c.seconds,
    date: c.date,
    dateLocale: c.dateLocale,
    sources: c.sources,
    instruction: c.instruction,
    layoutTemplate: c.layoutTemplateId?{id:c.layoutTemplateId,version:layoutTemplate(c.layoutTemplateId)!.version}:undefined,
    backgroundPreference:c.backgroundPreference,
    references: refs.map(({ id, name, usage }) => ({ id, name, usage })),
  });
  const issues:DesignIssue[]=[];
  const occurrences=new Map<string,number>();for(const value of data.layers)if(object(value)&&typeof value.id==="string")occurrences.set(value.id,(occurrences.get(value.id)||0)+1);
  const ids = new Set<string>();
  const parsed = data.layers.map((v: unknown,index:number) => {
   const identity=object(v)&&typeof v.id==="string"?v.id:"#"+index;
   try {
    const preliminary=layerInputIssues(v,index);
    if(object(v)&&typeof v.id==="string"&&(occurrences.get(v.id)||0)>1)preliminary.push({index,layerId:v.id,field:"id",code:"DUPLICATE_ID",message:"图层ID重复"});
    if(preliminary.length){issues.push(...preliminary);return null;}
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
      if (k === "thresholdRules"||k==="chart") continue;
      if(k === "handShape"){continue;}
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
      "autoSourceFormat",
      "metricDecoration",
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
      ["metric", "meter", "chart"].includes(v.kind) &&
      (!c.sources.includes(v.source) || typeof v.source !== "string")
    )
      throw Error("模型使用了未勾选或未绑定的数据源");
    if (v.kind === "meter" && !meterSources.includes(v.source))
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
      (!["monthDayWeek","weekdayDay"].includes(v.dateFormat) ||
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
    validateChart(item);
    if (crossesScreen(item))
      throw Error("图层“" + item.name + "”越出圆屏，请调整要求后重新生成");
    return item;
   }catch(e){issues.push({index,layerId:identity,field:"layer",code:"SEMANTIC_INVALID",message:(e as Error).message});return null;}
  });
  if(issues.length)throw new DesignValidationError(issues);
  result.layers=parsed as Layer[];
  const budget=designBudget(c);
  for(const [label,count,max] of [["圆环",result.layers.filter(l=>l.kind==="ring").length,budget.maxRings],["图片",result.layers.filter(l=>l.kind==="image").length,budget.maxImages],["基础图形",result.layers.filter(l=>["circle","rect","line","polygon"].includes(l.kind)).length,budget.maxShapes]] as [string,number,number][])if(count>max)throw Error(`当前复杂度${label}上限${max}，实际${count}；请精简或提高复杂度`);
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
          (["metric", "meter", "chart"].includes(l.kind) && l.source === src) ||
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
