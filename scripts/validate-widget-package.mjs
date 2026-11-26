import Ajv from "ajv";
import { readFile, lstat, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const schema = JSON.parse(await readFile(resolve(root,"resources/schemas/widget.schema.json"),"utf8"));
const validate = new Ajv({ allErrors:true, strict:false }).compile(schema);
const units = {heartRate:"bpm",steps:"count",calories:"kcal",battery:"%",altitude:"m",pressure:"hPa",temperature:"C",distance:"km",seconds:"seconds"};
export async function validateWidgetPackage(directory) {
  const dir = await realpath(resolve(directory));
  let bytes = 0;
  const loaded = new Map();
  const file = async path => {
    if (!/^[A-Za-z0-9_./-]+$/.test(path) || path.startsWith("/") || path.split("/").some(p=>!p || p===".." || p===".")) throw Error("Unsafe package path");
    let cursor=dir;
    for (const part of path.split("/")) { cursor=resolve(cursor,part); if ((await lstat(cursor)).isSymbolicLink()) throw Error("Linked resource not allowed"); }
    const target = resolve(dir,path), actual = await realpath(target);
    if (loaded.has(actual)) return loaded.get(actual);
    if (!actual.startsWith(dir+sep) || (await lstat(target)).isSymbolicLink()) throw Error("Linked resource not allowed");
    const stat = await lstat(actual);
    if (!stat.isFile() || stat.size>4*1024*1024) throw Error("Invalid/oversize resource: "+path);
    bytes+=stat.size; if (bytes>8*1024*1024) throw Error("Package resources exceed 8 MB");
    const data=await readFile(actual); loaded.set(actual,data); return data;
  };
  const manifest=JSON.parse(await file("widget.json"));
  if (!validate(manifest)) throw Error("Widget schema: "+JSON.stringify(validate.errors));
  if (manifest.origin.kind==="community" && !manifest.origin.sourceUrl) throw Error("Community origin needs source URL");
  await file(manifest.origin.licenseFile);
  for (const preview of Object.values(manifest.previews)) {
    const data=await file(preview);
    if (preview.endsWith(".svg") && /<script|<foreignObject|<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|(?:href|src)\s*=/i.test(data.toString())) throw Error("Preview SVG must be self-contained and passive");
  }
  const resources=new Map();
  for (const resource of manifest.resources) {
    if (resources.has(resource.id)) throw Error("Duplicate resource ID");
    resources.set(resource.id,resource);
    const data=await file(resource.file);
    if (data.subarray(0,8).toString("hex")!=="89504e470d0a1a0a" || data.length<24 || data.readUInt32BE(16)<1 || data.readUInt32BE(20)<1 || data.readUInt32BE(16)>2048 || data.readUInt32BE(20)>2048) throw Error("Invalid/oversize PNG");
    await file(resource.noticeFile);
  }
  const layers=new Map(), capabilities=new Set(manifest.requirements);
  for (const layer of manifest.layers) {
    if (layers.has(layer.id)) throw Error("Duplicate layer ID");
    layers.set(layer.id,layer);
    if (!capabilities.has("core."+layer.kind)) throw Error("Missing core requirement: "+layer.kind);
    if (layer.x<0 || layer.y<0 || layer.x+layer.w>manifest.canvas.width || layer.y+layer.h>manifest.canvas.height) throw Error("Layer outside widget canvas");
    if (layer.kind==="image" && !resources.has(layer.resourceId)) throw Error("Missing image resource");
    if (["circle","ring","hand"].includes(layer.kind) && layer.w!==layer.h) throw Error("Rotation/circle bounds must be square");
    const source=layer.kind==="ring"?layer.ringSource:["metric","meter"].includes(layer.kind)?layer.source:null;
    if (source && source!=="static" && !capabilities.has("data."+source)) throw Error("Missing data requirement");
    if (layer.kind==="meter" && (!["battery","steps"].includes(layer.source) || (layer.source==="battery" && layer.meterGoal!==100) || (layer.meterContinuous && layer.meterCount!==1) || (!layer.meterContinuous && layer.meterCount<4))) throw Error("Invalid native meter contract");
    let end=-Infinity;
    for (const band of layer.thresholdRules || []) {
      const min=band.min??-Infinity,max=band.max??Infinity;
      if (min<end || min>=max) throw Error("Thresholds overlap or are unsorted");end=max;
    }
    if (layer.thresholdRules?.length && (!layer.threshold || !layer.thresholdFallback)) throw Error("Threshold enable/fallback required");
  }
  const parameters=new Set(),targets=new Set();
  for (const parameter of manifest.parameters) {
    if (parameters.has(parameter.id)) throw Error("Duplicate parameter ID");parameters.add(parameter.id);
    if (parameter.type==="dataSource" && (!parameter.options.includes(parameter.default) || new Set(parameter.options.map(source=>units[source])).size!==1)) throw Error("Incompatible data source options");
    for (const target of parameter.targets) {
      const layer=layers.get(target.layerId), key=target.layerId+":"+target.property;
      if (!layer || targets.has(key)) throw Error("Missing/duplicate parameter target");targets.add(key);
      const property=target.property;
      if (parameter.type==="boolean" ? property!=="activeVisible" : parameter.type==="dataSource" ? property!=="source" || layer.kind!=="metric" : !(property==="color" || /^thresholdRules\.[0-7]\.color$/.test(property))) throw Error("Parameter type/target mismatch");
      const value=property==="activeVisible"?layer.activeVisible??true:property.startsWith("thresholdRules.")?layer.thresholdRules?.[Number(property.split(".")[1])]?.color:layer[property];
      if (value!==parameter.default) throw Error("Parameter default differs from layer");
    }
  }
  const cases=JSON.parse(await file(manifest.casesFile));
  if (cases.format!=="gfc-control-cases" || cases.formatVersion!==1 || !Array.isArray(cases.cases) || !cases.cases.length) throw Error("Missing cases");
  const ids=new Set();
  for (const sample of cases.cases) {
    if (!sample.id || ids.has(sample.id) || !sample.data || !sample.parameters || !sample.expect) throw Error("Invalid test case");ids.add(sample.id);
    for (const id of Object.keys(sample.parameters)) if (!parameters.has(id)) throw Error("Case references unknown parameter");
  }
  return {id:manifest.id,version:manifest.version,layers:layers.size,cases:ids.size};
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw Error("Usage: node scripts/validate-widget-package.mjs PACKAGE_DIRECTORY");
  console.log("PASS widget package",await validateWidgetPackage(process.argv[2]));
}
