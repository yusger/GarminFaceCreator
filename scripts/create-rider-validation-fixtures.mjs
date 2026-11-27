// Maintainer-only local Rider baseline conversion. No default-library registration or publishing.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,join,sep} from "node:path";
import {createHash} from "node:crypto";
import {chromium} from "@playwright/test";
import {project,layer,validateProject} from "../frontend/src/domain.ts";
import {validConvexPolygon as validPolygon,rotatePoint} from "../frontend/src/geometry.ts";
import {chalkPlans,chalkId} from "../frontend/src/chalkFonts.ts";
import {fontPatch} from "../frontend/src/fontLibrary.ts";
const source=process.argv[2];if(!source)throw Error("Pass Rider source directory explicitly");
const out=resolve("Temp/rider-validation");if(!out.startsWith(resolve("Temp")+sep))throw Error("Output must remain in local Temp");await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || "msedge"});
const page=await browser.newPage();await page.goto("about:blank");
const fonts={label:{...fontPatch("sonar_label_font")},number:{...fontPatch("sonar_number_font")}};
for(const [name,font] of Object.entries(fonts)){const bytes=await readFile("resources/shared/fonts/"+font.customFont.file);await page.evaluate(async({name,data})=>{const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),face=await new FontFace("Rider_"+name,bytes).load();document.fonts.add(face);},{name,data:bytes.toString("base64")});}
const hash=text=>createHash("sha256").update(text).digest("hex");
async function parse(svg){return page.evaluate(svg=>{const doc=new DOMParser().parseFromString(svg,"image/svg+xml");if(doc.querySelector("parsererror") || doc.documentElement.getAttribute("viewBox")!=="0 0 454 454")throw Error("Unsupported SVG root");const allowed=["svg","g","defs","clipPath","rect","line","circle","polygon","text"];for(const e of doc.querySelectorAll("*")){if(!allowed.includes(e.localName))throw Error("Unsupported SVG element "+e.localName);for(const a of e.attributes){if(/^on/i.test(a.name) || /href|style/i.test(a.name))throw Error("Active/external SVG attributes not permitted");}}return [...doc.querySelectorAll("rect,line,circle,polygon,text")].filter(e=>!e.closest("defs")).map(e=>({kind:e.localName,a:Object.fromEntries([...e.attributes].map(a=>[a.name,a.value])),text:e.textContent || ""}));},svg);}
function key(n){const geom={rect:["x","y","width","height","rx"],circle:["cx","cy","r"],line:["x1","y1","x2","y2"],polygon:["points"],text:["x","y","font-size","text-anchor","letter-spacing"]}[n.kind];return JSON.stringify([n.kind,...geom.map(k=>n.a[k] || "0"),n.kind==="text"?n.text:""]);}
async function measure(text,size,family="number",original=false){return page.evaluate(({text,size,family,original})=>{const c=document.createElement("canvas"),dc=c.getContext("2d");dc.font=original?`700 ${size}px Consolas,Menlo,monospace`:`${size}px Rider_${family}`;const m=dc.measureText(text);return {width:m.width,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent};},{text,size,family,original});}
try{for(const id of ["02","05"]){
 const raw=await readFile(join(resolve(source),"faces",id+"-normal.svg"),"utf8"),lowRaw=await readFile(join(resolve(source),"faces",id+"-aod.svg"),"utf8");
 const normal=await parse(raw),low=await parse(lowRaw),lowMap=new Map();for(const n of low){const k=key(n);lowMap.set(k,[...(lowMap.get(k)||[]),n]);}
 const p=project("Rider"+id+"-validation",true);p.backgroundColor="#000000";p.designBrief="Local editable Rider validation fixture; real time and sensor bindings. Licensed Share Tech Mono/Barlow replace source system fonts. Not a default-library or publishing package.";
 const baselineNodes=[],mappings=[],differences=["Consolas/Menlo 700 replaced with licensed Share Tech Mono/Barlow 400; glyph appearance is a known difference.","Source letter spacing is retained by positioned character children; original advances measured locally in the desktop source font, never distributed.","Circular clip radius221 is safe for these source geometries; editor uses round screen227.","SVG crispEdges versus native integer coordinates/ellipse sampling requires separate pixel evaluation."];
 let handIndex=0,index=0;
 const handAngles=[305,60,60],handTypes=["hour","minute","second"];
 async function convert(n,lowNode,onlyLow=false){
  const a=n.a,num=(k,d=0)=>Number(a[k]??d),identity="rider"+id+"-"+String(index++).padStart(3,"0"),fill=a.fill || "#000000",stroke=a.stroke || fill;
  if(n.kind==="rect" && num("width")===454 && num("height")===454){if(fill!=="#000000")throw Error("Unexpected background");return [];}
  const b=layer("rect");Object.assign(b,{id:identity,name:"Rider "+id+" "+n.kind+" "+index,color:n.kind==="line"?stroke:fill,fillEnabled:fill!=="none",strokeEnabled:!!a.stroke,strokeColor:stroke,strokeWidth:num("stroke-width",1),rotation:0,opacity:1,cornerRadius:num("rx"),aod:!!lowNode || onlyLow,aodColor:lowNode?.a[n.kind==="line"?"stroke":"fill"] || fill,activeVisible:!onlyLow,threshold:false});
  if(!/^#[a-fA-F0-9]{6}$/.test(b.color) && b.color!=="none")throw Error("Unsupported paint");if(b.color==="none")b.color=stroke;
  if(n.kind==="rect")Object.assign(b,{kind:"rect",x:num("x"),y:num("y"),w:num("width"),h:num("height")});
  else if(n.kind==="circle")Object.assign(b,{kind:"circle",x:num("cx")-num("r"),y:num("cy")-num("r"),w:2*num("r"),h:2*num("r")});
  else if(n.kind==="line"){
   const x1=num("x1"),y1=num("y1"),x2=num("x2"),y2=num("y2"),dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy);if(length<=1)throw Error("Line too short for this converter");const w=Math.sqrt(length*length-1),h=1;Object.assign(b,{kind:"line",x:(x1+x2-w)/2,y:(y1+y2-h)/2,w,h,rotation:(Math.atan2(dy,dx)-Math.atan2(h,w))*180/Math.PI,strokeEnabled:true,fillEnabled:false});
   const start=rotatePoint(b.x,b.y,b.x+w/2,b.y+h/2,b.rotation),end=rotatePoint(b.x+w,b.y+h,b.x+w/2,b.y+h/2,b.rotation);if(Math.hypot(start[0]-x1,start[1]-y1)>1e-6 || Math.hypot(end[0]-x2,end[1]-y2)>1e-6)throw Error("Line mapping drift");
  }else if(n.kind==="polygon"){
   const points=a.points.trim().split(/\s+/).map(p=>p.split(",").map(Number)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,normalized=points.map(([px,py])=>[(px-x)/w,(py-y)/h]);if(!validPolygon(normalized))throw Error("Unsupported source polygon; no shape approximation allowed");
   if(id==="02" && points.length===4 && points.some(([x,y])=>Math.hypot(x-227,y-227)<20) && points.every(([x,y])=>Math.hypot(x-227,y-227)<100)){
    const angle=handAngles[handIndex]*Math.PI/180,dx=Math.sin(angle),dy=-Math.cos(angle),local=points.map(([x,y])=>{const px=x-227,py=y-227;return [px*(-dy)+py*dx,px*dx+py*dy];}),half=Math.max(...local.map(p=>Math.abs(p[0]))),reach=Math.max(...local.map(p=>p[1])),tail=-Math.min(...local.map(p=>p[1])),side=200+2*half;
    Object.assign(b,{kind:"hand",x:227-side/2,y:227-side/2,w:side,h:side,handType:handTypes[handIndex++],handPivotX:.5,handPivotY:.5,handReach:reach/100,handTail:tail/100,strokeWidth:half*2,handShape:{id:"rider-armor",version:"1.0.0",points:local.map(([u,v])=>[Math.max(-1,Math.min(1,u/half)),Math.max(-1,Math.min(1,v/(v>=0?reach:tail)))])},aodSeconds:"hide"});
   }else Object.assign(b,{kind:"polygon",x,y,w,h,polygonPoints:normalized});
  }else if(n.kind==="text"){
   const sourceSize=num("font-size",14),size=Math.round(sourceSize),spacing=num("letter-spacing"),sourceKind=n.text==="10:24"?"time":({"72":"heartRate","8420":"steps","78%":"battery","426":"calories"}[n.text]?"metric":"text"),family=sourceKind==="text"?"label":"number",font=fonts[family],m=await measure(n.text,size,family),width=Math.max(1,m.width+2);
   Object.assign(b,{...font,kind:sourceKind,x:num("x")-width/2,y:num("y")-size,w:width,h:size+2,size,fontWeight:400,text:n.text,metricDecoration:false,precision:0,groupThousands:false,label:"",unit:sourceKind==="metric" && n.text.endsWith("%")?"%":"",missingValue:"--"});
   if(sourceKind==="metric")b.source={"72":"heartRate","8420":"steps","78%":"battery","426":"calories"}[n.text];if(sourceKind==="time")b.timePart="full";
   if(sourceSize!==size)differences.push(`${identity}: source ${sourceSize}px rounded to ${size}px resource size`);
   if(sourceKind==="text" && spacing>0 && n.text.length>1){
    const advances=await Promise.all([...n.text].map(c=>measure(c,sourceSize,family,true))),total=advances.reduce((s,a)=>s+a.width,0)+spacing*(advances.length-1);let x=0;const children=[...n.text].map((char,i)=>{const child={...b,id:identity+"-c"+i,name:char,text:char,x,y:0,w:Math.max(.1,advances[i].width),h:b.h};x+=advances[i].width+spacing;return child;});
    const parent={...layer("widget"),id:identity,name:"Rider "+id+" label "+n.text,x:num("x")-total/2,y:b.y,w:total,h:b.h,aod:b.aod,activeVisible:b.activeVisible,compound:{version:2,width:total,height:b.h,layers:children,controls:[],parts:[{id:"label",name:n.text,layerIds:children.map(c=>c.id),enabled:true}]}};children.forEach(c=>baselineNodes.push({layer:c,baseline:num("y"),parent}));return [parent];
   }
   baselineNodes.push({layer:b,baseline:num("y")});
  }else throw Error("Unsupported source node");
  return [b];
 }
 for(const node of normal){const candidates=lowMap.get(key(node)),matching=candidates?.shift();const converted=await convert(node,matching);p.layers.push(...converted);mappings.push({source:index,kind:node.kind,layers:converted.map(l=>l.id),aod:!!matching});}
 for(const rest of lowMap.values())for(const node of rest){const converted=await convert(node,node,true);p.layers.push(...converted);}
 const plans=chalkPlans(p),metrics=new Map();for(const plan of plans){const family=plan.font==="sonar-label-font.ttf"?"label":"number";const samples=await Promise.all([...plan.glyphs].map(c=>measure(c,plan.size,family)));const ascent=Math.ceil(Math.max(...samples.map(m=>m.ascent))),descent=Math.ceil(Math.max(...samples.map(m=>m.descent)));metrics.set(plan.id,{ascent,descent});}
 const updatedParents=new Set();for(const item of baselineNodes){const m=metrics.get(chalkId(item.layer)),height=m.ascent+m.descent+2,y=item.baseline-m.ascent-1;if(item.parent){item.layer.y=0;item.layer.h=height;if(!updatedParents.has(item.parent.id)){item.parent.y=y;item.parent.h=height;item.parent.compound.height=height;updatedParents.add(item.parent.id);}}else{item.layer.y=y;item.layer.h=height;}}
 if(id==="02")differences.push("Source comment says10:24, but polygon angles305/60/60 are a10:10-style static illustration; live clock at10:10:10 differs by about1 degree for minute/hour due true seconds interpolation.");
 const report={id,sourceSha256:hash(raw),aodSha256:hash(lowRaw),sourceNormalNodes:normal.length,sourceAodNodes:low.length,topLevelLayers:p.layers.length,editablePrivateParts:p.layers.reduce((n,l)=>n+(l.compound?.layers.length || 1),0),mapping:mappings,differences,fonts:"licensed Share Tech Mono + Barlow Semi Condensed; source system font bytes not copied",fixedPreview:{time:id==="02"?"10:10":"10:24",seconds:id==="02"?10:0,heartRate:72,steps:8420,battery:78,values:{calories:426}},status:{structure:"validated",visual:"pending",sdk:"pending",native:"pending",hardware:"unverified",aodEvent:"unverified"}};
 for(const [target,size] of [["venu445mm","45mm"],["venu441mm","41mm"]]){const q=structuredClone(p);q.target=target;q.deviceSize=size;const identity=hash("rider-validation-"+id+target).slice(0,32);q.id=identity.slice(0,8)+"-"+identity.slice(8,12)+"-"+identity.slice(12,16)+"-"+identity.slice(16,20)+"-"+identity.slice(20);q.appId=identity;validateProject(q);await writeFile(join(out,`rider${id}-${target}.json`),JSON.stringify(q,null,2)+"\n");}
 await writeFile(join(out,"rider"+id+"-audit.json"),JSON.stringify(report,null,2)+"\n");console.log(`Rider${id}: ${p.layers.length} top-level / ${report.editablePrivateParts} editable parts; not registered or published`);
}}finally{await browser.close();}
