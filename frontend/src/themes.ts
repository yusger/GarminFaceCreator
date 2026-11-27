import {resolveControls,setControl} from "./projectControls.ts";
import {contextIdentity} from "./localIdentity.ts";
import type { Project, Layer } from "./domain.ts";
export function themeCode(id:string){return parseInt(contextIdentity(id).split(":")[1].slice(0,8),16)&0x7fffffff;}
export const themeBackgroundKey=(id:string)=>"Gfc_Background_"+themeCode(id);
export type ThemePreset = {
  id: string;
  name: string;
  layerIds: string[];
  controlIds: string[];
  backgroundColor: string;
  version: string;
};
export type ThemeSet = {
  version: 1;
  activeId: string;
  defaultId: string;
  presets: ThemePreset[];
  overrides?:Record<string,{backgroundColor?:string}>;
};
export function activeTheme(p: Pick<Project, "themes">) {
  return (
    p.themes?.presets.find((t) => t.id === p.themes!.activeId) ||
    p.themes?.presets.find((t) => t.id === p.themes!.defaultId)
  );
}
export function themeBackground(p:Pick<Project,"themes"|"backgroundColor">,id=activeTheme(p)?.id){return (id?p.themes?.overrides?.[id]?.backgroundColor||p.themes?.presets.find(t=>t.id===id)?.backgroundColor:undefined)||p.backgroundColor||"#000000";}
export function setThemeBackground(p:Project,color:string):Project{
 if(p.multiDevice?.scope==="device")throw Error("请切换共享主设计后修改主题");
 if(!/^#[0-9a-f]{6}$/i.test(color))throw Error("主题背景色无效");
 const theme=activeTheme(p);if(!p.themes||!theme)return {...p,backgroundColor:color};
 return {...p,themes:{...p.themes,overrides:{...p.themes.overrides,[theme.id]:{...p.themes.overrides?.[theme.id],backgroundColor:color}}}};
}
export function themeIndex(p: Pick<Project, "themes">) {
  return p.themes?.presets.findIndex((t) => t.id === activeTheme(p)?.id) ?? 0;
}
export function layerThemeIndex(p: Pick<Project, "themes">, id: string) {
  return p.themes?.presets.findIndex((t) => t.layerIds.includes(id)) ?? -1;
}
export function themeLayers(p: Project) {
  const current = activeTheme(p);
  return current
    ? p.layers.filter(
        (l) => layerThemeIndex(p, l.id) < 0 || current.layerIds.includes(l.id),
      )
    : p.layers;
}
export function themeControls(p: Project) {
  const current = activeTheme(p);
  return current
    ? (p.controls || []).filter(
        (c) =>
          !p.themes!.presets.some((t) => t.controlIds.includes(c.id)) ||
          current.controlIds.includes(c.id),
      )
    : p.controls || [];
}
export function validateThemes(p: Project) {
  const set = p.themes;
  if (set === undefined) return;
  if (
    !set ||
    set.version !== 1 ||
    !Array.isArray(set.presets) ||
    set.presets.length < 2 ||
    set.presets.length > 8 ||
    typeof set.activeId !== "string" ||
    set.activeId.length > 80
  )
    throw Error("主题预设格式无效");
  const codes=new Set<number>();
  const ids = new Set(),
    layers = new Set(),
    controls = new Set();
  for (const t of set.presets) {
    if (
      !t ||
      !/^[a-z][a-z0-9-]{0,79}$/.test(t.id) ||
      ids.has(t.id) ||
      typeof t.name !== "string" ||
      !t.name.trim() ||
      t.name.length > 80 ||
      typeof t.version !== "string" ||
      !/^\d+\.\d+\.\d+$/.test(t.version) ||
      !/^#[0-9a-f]{6}$/i.test(t.backgroundColor) ||
      !Array.isArray(t.layerIds) ||
      !Array.isArray(t.controlIds) ||
      t.layerIds.length > 200 ||
      t.controlIds.length > 40
    )
      throw Error("主题身份、外观或引用无效");
    if(codes.has(themeCode(t.id)))throw Error("主题身份数值码冲突，请更换主题ID");
    codes.add(themeCode(t.id));
    ids.add(t.id);
    for (const id of t.layerIds) {
      if (
        typeof id !== "string" ||
        layers.has(id) ||
        !p.layers.some((l) => l.id === id)
      )
        throw Error("主题图层缺失或重复归属");
      layers.add(id);
    }
    for (const id of t.controlIds) {
      const c = p.controls?.find((c) => c.id === id);
      if (
        typeof id !== "string" ||
        controls.has(id) ||
        !c ||
        (c.targets.some((x) => !t.layerIds.includes(x.layerId))||Object.values(c.sourceIcons||{}).flat().some(id=>!t.layerIds.includes(id)))
      )
        throw Error("主题配置缺失或跨主题引用");
      controls.add(id);
    }
  }
  if(set.overrides!==undefined){if(!set.overrides||typeof set.overrides!=="object"||Array.isArray(set.overrides)||Object.entries(set.overrides).some(([id,v])=>!ids.has(id)||!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).some(k=>k!=="backgroundColor")||v.backgroundColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(v.backgroundColor)))throw Error("主题覆盖引用或背景色无效");}
  if (!ids.has(set.defaultId)) throw Error("主题默认项不存在");
  for (const c of p.controls || [])
    if (!controls.has(c.id) && c.targets.some((x) => layers.has(x.layerId)))
      throw Error("主题内部配置必须归属于该主题");
}
export function selectTheme(p: Project, id: string): Project {
  if (p.multiDevice?.scope === "device")
    throw Error("请切换共享主设计后切换主题");
  if (!p.themes?.presets.some((t) => t.id === id)) throw Error("主题不存在");
  return {
    ...p,
    themes: { ...p.themes, activeId: id },
    revision: p.revision + 1,
    codeRevision: -1,
    updated: Date.now(),
  };
}
export function resetTheme(p: Project): Project {
  const theme = activeTheme(p);
  if (!theme) return p;
  const values = Object.fromEntries(
    Object.entries(p.controlValues || {}).filter(
      ([id]) => !theme.controlIds.includes(id),
    ),
  );
  const next=selectTheme(p,theme.id),overrides={...next.themes!.overrides};delete overrides[theme.id];
  return {...next,themes:{...next.themes!,overrides},controlValues:values};
}
// Layer-list operations operate only on the visible preset; other presets retain exact identities and order.
export function mergeThemeLayers(p:Project,edited:Layer[]){
 const resolved=resolveControls(p).layers,shown=new Set(resolved.map(l=>l.id));
 const patches=edited.map(l=>{const raw=p.layers.find(x=>x.id===l.id),effective=resolved.find(x=>x.id===l.id);if(!raw||!effective)return l;const delta=Object.fromEntries(Object.keys(l).filter(key=>JSON.stringify(l[key as keyof Layer])!==JSON.stringify(effective[key as keyof Layer])).map(key=>[key,l[key as keyof Layer]]));return {...raw,...delta};});
 const result:Layer[]=[];let inserted=false;
 for(const l of p.layers){if(shown.has(l.id)){if(!inserted){result.push(...patches);inserted=true;}}else result.push(l);}
 if(!inserted)result.push(...patches);return result;
}
export function resolvedLayerEdits(p:Project,edited:Layer[]):Project{
 let next=p;const baseline=resolveControls(p).layers;
 for(const l of edited){const before=baseline.find(x=>x.id===l.id);if(before&&before.color!==l.color){const c=p.controls?.find(c=>c.type==="color"&&c.targets.some(t=>t.layerId===l.id&&t.property==="color"));if(c)next=setControl(next,c.id,l.color);}}
 return {...next,layers:mergeThemeLayers(p,edited)};
}
