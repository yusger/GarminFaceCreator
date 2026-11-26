import catalog from "./handStyleCatalog.json" with {type:"json"};
import type { Layer } from "./domain";
export const handStyles=catalog;
export function handStylePatch(id:string):Partial<Layer> {
 if(!id)return {handShape:undefined,handBitmap:undefined,image:undefined,assetId:undefined,imageFullColor:undefined};
 const style=handStyles.find(s=>s.id===id);if(!style)throw Error("指针样式不存在");
 return {handBitmap:undefined,image:undefined,assetId:undefined,imageFullColor:undefined,handShape:{id:style.id,version:style.version,points:structuredClone(style.geometry.points) as [number,number][]},strokeWidth:style.defaultWidth};
}
