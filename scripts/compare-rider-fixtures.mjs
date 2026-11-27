// Maintainer-only comparison. Images remain in ignored Temp; measurements are not acceptance thresholds.
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {chromium} from "@playwright/test";
const dir=resolve("Temp/rider-validation"),browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||"msedge"});
try{const page=await browser.newPage();const results=[];
for(const id of ["02","05"])for(const pixels of [454,390])for(const mode of ["active","aod"]){
 const native=await readFile(join(dir,`native-${id==="02"?"":"fixed-"}${id}-${pixels}-${mode}.png`));
 const input=await Promise.all([`original-${id}-${pixels}-${mode}.png`,`browser-${id}-${pixels}-${mode}.png`].map(n=>readFile(join(dir,n))));input.push(native);
 const r=await page.evaluate(async({images,pixels})=>{
  const canvas=document.createElement("canvas");canvas.width=pixels*3;canvas.height=pixels;const dc=canvas.getContext("2d"),arrays=[];
  for(let i=0;i<3;i++){const img=new Image();img.src=images[i];await img.decode();if(img.width!==pixels||img.height!==pixels)throw Error("Dimensions differ");dc.drawImage(img,i*pixels,0);arrays.push(dc.getImageData(i*pixels,0,pixels,pixels).data);}
  const compare=(a,b)=>{let absolute=0,changed=0,foreground=0,foregroundChanged=0;for(let i=0;i<a.length;i+=4){let d=0;for(let k=0;k<3;k++){const v=Math.abs(a[i+k]-b[i+k]);absolute+=v;d=Math.max(d,v);}const lit=Math.max(...a.slice(i,i+3),...b.slice(i,i+3))>16;if(d>16)changed++;if(lit){foreground++;if(d>16)foregroundChanged++;}}return {meanAbsoluteRgbError:absolute/(pixels*pixels*3),pixelsOver16:changed,foregroundPixels:foreground,foregroundPixelsOver16:foregroundChanged};};
  return {png:canvas.toDataURL("image/png"),originalVsBrowser:compare(arrays[0],arrays[1]),browserVsNative:compare(arrays[1],arrays[2])};
 },{images:input.map(b=>"data:image/png;base64,"+b.toString("base64")),pixels});
 await writeFile(join(dir,`comparison-${id}-${pixels}-${mode}.png`),Buffer.from(r.png.split(",")[1],"base64"));delete r.png;results.push({id,pixels,mode,...r});
}
await writeFile(join(dir,"comparisons.json"),JSON.stringify({version:1,columns:["original SVG local rasterization","editable browser capture","SDK native capture"],metric:"Absolute RGB error; per-pixel maximum channel difference >16. Descriptive only, not a fidelity pass. Black background can bias whole-image scores.",aod:"forced source draw branch; no sleep event acceptance",results},null,2)+"\n");console.log("8 local comparison sheets and descriptive measurements prepared");
}finally{await browser.close();}
