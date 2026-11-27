import {test,expect} from "@playwright/test";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {project,layer} from "../src/domain";
import {insertWidget} from "../src/widgets";
const dir="frontend/tests/baselines/pure-watchface";
const sha=(b:Uint8Array)=>createHash("sha256").update(b).digest("hex");
for(const [target,size,pixels] of [["venu445mm","45mm",454],["venu441mm","41mm",390]] as const)test(`fixed capture gallery ${target}`,async({page,browser,request})=>{
 test.skip(process.env.GFC_CAPTURE_BASELINES!=="1","Explicit pinned-browser pixel baseline check");test.setTimeout(120000);
 await page.clock.setFixedTime(new Date("2026-11-23T02:24:00Z"));await page.goto("/");
 let p=insertWidget(project("Capture Gallery "+size,true),"capsule-metric");p.target=target;p.deviceSize=size;p.backgroundColor="#10252f";
 p.layers[0].x=97;p.layers[0].y=225;p.layers[0].w=260;p.layers[0].h=75;
 p.layers.push({...layer("time"),x:65,y:115,w:324,h:80,garminFont:"chalk",size:64,aod:true},
 {...layer("text"),x:90,y:320,w:274,h:50,text:"测试心率",garminFont:"chalkHan",size:30,aod:true},
 {...layer("image"),x:85,y:75,w:40,h:40,aod:true,libraryIcon:{id:"lucide_586bf5cf_heart_pulse",recolor:true,strokeWidth:2},color:"#4fd1c5"},
 {...layer("rect"),x:313,y:83,w:36,h:36,rotation:30,opacity:0.5,color:"#ffbb44",cornerRadius:8,aod:false});
 const image=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=32;c.height=32;const d=c.getContext("2d")!;d.fillStyle="rgba(255,80,70,0.6)";d.fillRect(8,8,16,16);return c.toDataURL("image/png");});
 p.layers.push({...layer("image"),x:290,y:305,w:48,h:48,image,aod:true});
 const original=JSON.stringify(p);
 await page.evaluate(value=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open("garmin-face-creator",2);r.onsuccess=()=>{const db=r.result,tx=db.transaction("projects","readwrite");tx.objectStore("projects").put(value);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),p);
 await page.reload();await page.getByRole("button",{name:"我的表盘",exact:true}).click();await page.getByRole("button",{name:"打开 "+p.name,exact:true}).click();await page.getByRole("button",{name:"预览",exact:true}).click();
 await page.getByLabel("模拟时间",{exact:true}).fill("12:34");await page.getByLabel("预览日期",{exact:true}).fill("2026-11-23");await page.getByLabel("模拟秒数",{exact:true}).fill("56");await page.getByLabel("模拟心率",{exact:true}).fill("72");await page.getByLabel("模拟步数",{exact:true}).fill("4567");await page.getByLabel("模拟电量",{exact:true}).fill("78");
 const files=["PermanentMarker-Regular.ttf","MaShanZheng-Regular.ttf"],fonts:Record<string,string>={};for(const file of files){const r=await request.get("/fonts/"+file);expect(r.ok()).toBe(true);fonts[file]=sha(await r.body());}
 const decode=async(bytes:Buffer)=>page.evaluate(async(encoded)=>{const img=new Image();img.src="data:image/png;base64,"+encoded;await img.decode();const c=document.createElement("canvas");c.width=img.width;c.height=img.height;const x=c.getContext("2d")!;x.drawImage(img,0,0);return Array.from(x.getImageData(0,0,c.width,c.height).data);},bytes.toString("base64"));
 const download=async(name:string)=>{const wait=page.waitForEvent("download");await page.getByRole("button",{name,exact:true}).click();return readFile((await(await wait).path())!);};
 for(const [mode,label] of [["active","下载亮屏盘面"],["aod","下载息屏盘面"]] as const){
   const bytes=await download(label),again=await download(label),rgba=await decode(bytes);expect(await decode(again)).toEqual(rgba);expect(bytes.readUInt32BE(16)).toBe(pixels);expect(bytes.readUInt32BE(20)).toBe(pixels);expect(rgba[3]).toBe(0);
   const metadata=JSON.parse((await download("下载截图参数")).toString());expect(metadata).toMatchObject({rendererVersion:"browser-capture-2",width:pixels,height:pixels,mode,device:{target},preview:{time:"12:34",heartRate:72,steps:4567,battery:78,seconds:mode==="aod"?0:56,calendarDate:"2026-11-23"}});
   const name=`${target}-${mode}`,conditions={fixtureVersion:"capture-gallery-1",rendererVersion:metadata.rendererVersion,browserVersion:browser.version(),userAgent:metadata.browser,viewport:{width:1600,height:1000},deviceScaleFactor:await page.evaluate(()=>devicePixelRatio),fonts,iconCatalogSha256:sha(await(await request.get("/icon-library/catalog.json")).body()),target,pixels,mode,tolerance:{maximumChangedChannels:0,scope:"identical pinned browser and resources only"}};
   if(process.env.GFC_UPDATE_CAPTURE_BASELINES==="1"){await mkdir(dir,{recursive:true});await writeFile(`${dir}/${name}.png`,bytes);await writeFile(`${dir}/${name}.json`,JSON.stringify(conditions,null,2)+"\n");}
   const pinned=JSON.parse(await readFile(`${dir}/${name}.json`,"utf8"));expect(conditions,"Baseline environment changed; inspect before explicitly updating").toEqual(pinned);
   const baseline=await decode(await readFile(`${dir}/${name}.png`));expect(rgba.length).toBe(baseline.length);let changed=0;for(let i=0;i<rgba.length;i++)if(rgba[i]!==baseline[i])changed++;expect(changed).toBeLessThanOrEqual(pinned.tolerance.maximumChangedChannels);
 }
 expect(JSON.stringify(p)).toBe(original);
});
