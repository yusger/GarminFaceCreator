import {binaryAssets} from "./assets.ts";
import {nativeFontBindings} from "./nativeFontResources";
import type {CodeFile,Project} from "./domain.ts";
// Existing legacy font descriptors remain local project resources; the model only needs their names.
export function preservedFontResources(p:Project){
 const assets=new Set(binaryAssets(p).map(a=>a.path));
 const originals=(p.versions||[]).filter(v=>v.provenance?.primary==="reference").flatMap(v=>v.files);
 const files=[...originals,...p.files],fonts=new Map<string,CodeFile>();
 for(const f of files){
  if(!/^resources\/fonts\/[\w-]+\.fnt$/.test(f.path)||/\/Gfc(?:Chalk|Custom|Bitmap|Mask|Library)/.test(f.path))continue;
  if(new TextEncoder().encode(f.content).length>256*1024)throw Error("Existing font descriptor exceeds256KiB");
  const pages=[...f.content.matchAll(/^page\s+id=(\d+)\s+file="([\w-]+\.png)"\s*$/gm)];
  if((f.content.match(/^page\b.*$/gm)||[]).length!==1||pages.length!==1||pages[0][1]!=="0")continue;
  const atlasPath="resources/fonts/"+pages[0][2];if(!assets.has(atlasPath))continue;
  fonts.set(f.path,f);
 }
 if(fonts.size>8)throw Error("Too many preserved legacy font descriptors");
 const used=new Set(nativeFontBindings(p).flatMap(b=>[b.activeFontId,...(b.aodFontId?[b.aodFontId]:[])]));
 if(fonts.size&&fonts.size+used.size>(p.themes&&p.themes.presets.length>1?16:8))throw Error("Preserved and generated fonts exceed the target font budget");
 return [...fonts.values()].map(file=>{
  const page=file.content.match(/^page\s+id=0\s+file="([\w-]+\.png)"\s*$/m)![1];
  const ids=[...new Set(files.filter(f=>f.path.startsWith("resources/")&&f.path.endsWith(".xml")).flatMap(f=>[...f.content.matchAll(/<font\b[^>]*>/g)].flatMap(m=>{
   const id=m[0].match(/\bid\s*=\s*["']([\w]+)["']/)?.[1],name=m[0].match(/\bfilename\s*=\s*["']([^"']+)["']/)?.[1];
   return id&&name&&(name===file.path.split("/").at(-1)||name.endsWith("/"+file.path.split("/").at(-1)))?[id]:[];
  })))];
  return {file,atlasPath:"resources/fonts/"+page,resourceIds:ids};
 });
}
export function preservedFontBindings(p:Project){return preservedFontResources(p).map(({file,atlasPath,resourceIds})=>({path:file.path,atlasPath,resourceIds,preserved:true,policy:"The frontend retains this existing FNT text and matching PNG. Declare fonts using this FNT descriptor, never the PNG atlas as the font filename. Keep exact glyph metrics; do not regenerate the descriptor or invent another typeface."}));}
export function mergePreservedFonts(p:Project,files:CodeFile[]):CodeFile[]{const paths=new Set(files.map(f=>f.path));return [...files,...preservedFontResources(p).filter(r=>!paths.has(r.file.path)).map(r=>r.file)];}
