import {test,expect} from "@playwright/test";
import {project,layer} from "../src/domain";
import {localGenerate} from "../src/localGenerator";
import {nativeImageBindings} from "../src/nativeImageResources";
test("engineering image dimensions agree with actual native resource scaling for both Venu sizes",()=>{
 for(const target of ["venu445mm","venu441mm"]){
  const p=project("Image resource",true);p.target=target;p.deviceSize=target==="venu445mm"?"45mm":"41mm";
  const l=layer("image");Object.assign(l,{id:"portrait",image:"data:image/png;base64,iVBORw0KGgo=",w:220,h:220,imageFullColor:true});p.layers=[l];
  const b=nativeImageBindings(p)[0],xml=localGenerate(p).find(f=>f.path==="resources/drawables/drawables.xml")!.content;
  expect(b.widthPx).toBe(target==="venu445mm"?220:189);expect(b.heightPx).toBe(b.widthPx);
  expect(xml).toContain('scaleX="'+b.resourceScale.scaleX+'"');expect(xml).toContain('scaleY="'+b.resourceScale.scaleY+'"');expect(xml).toContain('packingFormat="'+b.packingFormat+'"');
  expect(b).not.toHaveProperty("image");expect(b.path).toBe("assets/portrait.png");
 }
});
test("shared source images retain per-layer dimensions and managed icon fonts are not bitmap declarations",()=>{
 const p=project("Shared art",true),a=layer("image"),b=layer("image"),icon=layer("image");
 Object.assign(a,{id:"small",assetId:"shared",image:"data:image/png;base64,a",w:20,h:20});Object.assign(b,{...a,id:"large",w:100,h:100});Object.assign(icon,{id:"icon",image:"data:image/png;base64,a",iconMask:true});p.layers=[a,b,icon];
 const result=nativeImageBindings(p);expect(result.map(x=>x.layerId)).toEqual(["small","large"]);expect(result[0].path).toBe(result[1].path);expect(result[0].widthPx).not.toBe(result[1].widthPx);
});
