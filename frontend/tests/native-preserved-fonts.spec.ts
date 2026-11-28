import {test,expect} from "@playwright/test";
import {project} from "../src/domain";
import {mergePreservedFonts,preservedFontBindings} from "../src/nativePreservedFonts";
const descriptor={path:"resources/fonts/Original.fnt",content:'info face="Original" size=20\ncommon lineHeight=20 base=16 scaleW=16 scaleH=16 pages=1 packed=0\npage id=0 file="Original.png"\nchars count=0'};
test("reference font descriptors and resource IDs survive AI replacement without sending glyph text",()=>{
 const p=project("Font",true);p.assets=[{path:"resources/fonts/Original.png",data:"data:image/png;base64,a"}];p.files=[descriptor,{path:"resources/fonts/fonts.xml",content:'<fonts><font id="OriginalId" filename="Original.fnt"/></fonts>'}];
 const bindings=preservedFontBindings(p);expect(bindings[0].resourceIds).toEqual(["OriginalId"]);expect(bindings[0].atlasPath).toBe("resources/fonts/Original.png");expect(bindings[0]).not.toHaveProperty("content");
 p.versions=[{id:"reference",at:0,revision:0,files:p.files,provenance:{primary:"reference"}}];p.files=[{path:"source/View.mc",content:"original model drawing"}];
 const result=mergePreservedFonts(p,p.files);expect(result[0]).toEqual(p.files[0]);expect(result[1]).toEqual(descriptor);expect(mergePreservedFonts(p,result)).toEqual(result);
});
test("unavailable atlas, unsafe pages and managed platform fonts are not restored as legacy fonts",()=>{
 const p=project("Font",true);p.files=[descriptor];expect(preservedFontBindings(p)).toEqual([]);
 p.assets=[{path:"resources/fonts/Original.png",data:"data:image/png;base64,a"}];p.files=[{...descriptor,content:descriptor.content.replace('file="Original.png"','file="../Original.png"')}];expect(preservedFontBindings(p)).toEqual([]);
 p.files=[{...descriptor,path:"resources/fonts/GfcChalkLatin20.fnt"}];expect(preservedFontBindings(p)).toEqual([]);
});
