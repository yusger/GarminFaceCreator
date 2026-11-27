// Maintain one editable, three-preset study. Not a default-library auto-publication.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {deflateSync} from "node:zlib";
import {crc32} from "../frontend/src/zip.ts";
import {project,layer,validateProject} from "../frontend/src/domain.ts";
import {importLocalFont} from "../frontend/src/localFonts.ts";
const root=resolve("resources/design-studies/native454"),read=async file=>readFile(resolve(root,"source",file)),json=async file=>JSON.parse(await read(file));
const names=["apex","trail","vital"],packs=await Promise.all(names.map(n=>json(n+"/watchface.json"))),p=project("Native454",true);
p.id="00000000-0000-4000-8000-000000000454";p.appId="45445445445445445445445445445445";p.updated=0;p.layers=[];p.controls=[];p.target="venu445mm";p.deviceSize="45mm";p.backgroundColor=packs[0].canvas.background;p.localFonts=[];
const fonts=new Map();for(const r of packs[0].resources.filter(r=>r.type==="font")){const f=await importLocalFont(new File([new Uint8Array(await read("apex/"+r.file))],r.file.split("/").at(-1)),await read("apex/"+r.noticeFile).then(b=>b.toString("utf8")),"Author-supplied Native454 study; OFL notices retained");p.localFonts.push(f);fonts.set(r.id,{id:f.id,family:f.family,file:f.file});}
const dataSources=["heartRate","steps","calories","distance","battery","temperature"];
const iconAssets=new Map();for(let pi=0;pi<packs.length;pi++){const pkg=packs[pi];for(const value of pkg.layers.filter(l=>l.type==="metric"&&l.visible&&l.id.startsWith("value-"))){const rawIcon=pkg.layers.find(l=>l.id===value.id.replace("value-","icon-"));if(rawIcon&&!iconAssets.has(value.binding.source)){const r=pkg.resources.find(r=>r.id===rawIcon.resourceId);iconAssets.set(value.binding.source,"data:image/png;base64,"+(await read(names[pi]+"/"+r.file)).toString("base64"));}}}
// Two small original alpha icons for sources absent from the supplied artwork.
function proceduralIcon(source){const size=24,rgba=Buffer.alloc((size*4+1)*size);const pixel=(x,y)=>{if(x<0||y<0||x>=size||y>=size)return;const i=y*(size*4+1)+1+x*4;rgba[i]=rgba[i+1]=rgba[i+2]=rgba[i+3]=255;};const rect=(x,y,w,h)=>{for(let xx=x;xx<x+w;xx++)for(let yy=y;yy<y+h;yy++)if(xx<x+2||xx>=x+w-2||yy<y+2||yy>=y+h-2)pixel(xx,yy);};if(source==="battery"){rect(2,6,18,12);for(let y=9;y<15;y++)for(let x=20;x<23;x++)pixel(x,y);}const chunk=(name,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length,0);b.write(name,4);data.copy(b,8);b.writeUInt32BE(crc32(b.subarray(4,b.length-4)),b.length-4);return b;};const hdr=Buffer.alloc(13);hdr.writeUInt32BE(size,0);hdr.writeUInt32BE(size,4);hdr[8]=8;hdr[9]=6;return "data:image/png;base64,"+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",hdr),chunk("IDAT",deflateSync(rgba)),chunk("IEND",Buffer.alloc(0))]).toString("base64");}
iconAssets.set("battery",proceduralIcon("battery"));
p.themes={version:1,activeId:"apex",defaultId:"apex",presets:[]};const changes=[];
for(let ti=0;ti<packs.length;ti++){
 const theme=names[ti],pkg=packs[ti],id=raw=>theme+"_"+raw.replaceAll("-","_"),layers=[],controls=[];
 const sourceMap=new Map(pkg.resources.map(r=>[r.id,r]));
 for(const raw of [...pkg.layers].sort((a,b)=>a.zIndex-b.zIndex)){
  if(raw.id==="aod-foot"){changes.push(theme+": removed preview-only AOD explanation caption");continue;}
  const l={...layer(raw.type),id:id(raw.id),name:theme+" · "+raw.name,x:raw.bounds.x,y:raw.bounds.y,w:raw.bounds.width,h:raw.bounds.height,color:raw.style.color||raw.style.fill||"#EAF1F6",size:raw.style.fontSize||28,activeVisible:raw.visible,aod:raw.aod.visible,aodColor:raw.aod.color||"#777777",aodSize:raw.aod.fontSize||raw.style.fontSize||28,fontWeight:400,opacity:raw.style.opacity??1,rotation:raw.rotation||0,metricDecoration:false,hidden:false,locked:false,allowClip:raw.safeArea==="decoration",textAlign:raw.style.align||"center"};
  if(raw.style.font)l.customFont=fonts.get(raw.style.font);
  if(raw.type==="image"){const r=sourceMap.get(raw.resourceId);l.image="data:image/png;base64,"+(await read(theme+"/"+r.file)).toString("base64");l.assetId=id(raw.resourceId);l.imageFullColor=true;}
  if(raw.type==="text")l.text=raw.text||"";
  if(raw.type==="time"){l.timePart={"HH:mm":"full",HH:"hours",mm:"minutes",ss:"seconds"}[raw.format];l.aodSeconds="hide";}
  if(raw.type==="date"){l.dateLocale="en";l.dateFormat=raw.format==="ddd DD"?"weekdayDay":"monthDayWeek";}
  if(raw.type==="metric"){l.source=raw.binding.source;l.sourceLocked=false;l.label="";l.unit=raw.format.unitMode==="none"?"":raw.format.unitMode==="custom"?raw.format.unit:undefined;l.precision=raw.format.precision==="auto"?undefined:raw.format.precision;l.groupThousands=raw.format.groupThousands;l.missingValue=raw.format.missing;}
  if(raw.type==="meter"){l.source=raw.binding.source;l.meterContinuous=true;l.meterShape="bar";l.meterGoal=raw.goal;l.meterCount=1;l.meterDimColor=raw.style.dimColor;}
  if(raw.thresholdGroup){const group=pkg.thresholds.find(g=>g.id===raw.thresholdGroup);l.threshold=true;l.thresholdFallback=group.fallbackColor;l.thresholdRules=group.bands.map(b=>({...b.min===null?{}:{min:b.min},...b.max===null?{}:{max:b.max},color:b.color}));}
  if(raw.type==="rect"){l.fillEnabled=!!raw.style.fill;l.strokeEnabled=!!raw.style.stroke;l.strokeColor=raw.style.stroke;l.strokeWidth=raw.style.strokeWidth||1;l.cornerRadius=raw.style.cornerRadius||0;}
  layers.push(l);
 }
 const find=key=>layers.find(l=>l.id===id(key));const control=(slug,label,type,def,targets,extra={})=>{const c={id:theme+"-"+slug,label:theme+" · "+label,type,default:def,targets,...extra};controls.push(c);return c;};
 const activeValues=pkg.layers.filter(l=>l.type==="metric"&&l.visible&&l.binding.source!=="battery");
 for(const raw of activeValues){
  const value=find(raw.id),source=raw.binding.source,targets=[{layerId:value.id,property:"source"}],aodKey=theme==="trail"?(source==="temperature"?"aod-temp":source==="distance"?"aod-distance":null):source==="heartRate"?"aod-hr":null;
  if(aodKey&&find(aodKey))targets.push({layerId:find(aodKey).id,property:"source"});
  const labels=raw.id.startsWith("value-")?pkg.layers.filter(l=>l.id===raw.id.replace("value-","label-")):[];if(raw.id==="heart-big")labels.push(pkg.layers.find(l=>l.id==="hr-unit"));
  for(const label of labels.filter(Boolean)){find(label.id).sourceLabelFor=value.id;find(label.id).sourceLabelStyle=raw.id==="heart-big"?"unitLabel":"unit";}
  if(aodKey){const labelKey=theme==="apex"?"aod-hr-label":theme==="vital"?"aod-hr-cap":source==="distance"?"aod-km":null;if(labelKey&&find(labelKey)){find(labelKey).sourceLabelFor=find(aodKey).id;find(labelKey).sourceLabelStyle=theme==="vital"?"label":"unit";}}
  const c=control(raw.id.replaceAll("_","-"),raw.name,"dataSource",source,targets,{slot:true,options:dataSources,sourceUnits:Object.fromEntries(dataSources.map(s=>[s,s==="temperature"?"°":""])),sourcePrecisions:{[source]:raw.format.precision==="auto"?0:raw.format.precision},sourceIcons:{}});
  const baseIcon=raw.id.startsWith("value-")?pkg.layers.find(l=>l.id===raw.id.replace("value-","icon-")):null;const colorTargets=[{layerId:value.id,property:"color"}];if(value.thresholdRules?.length)colorTargets.push({layerId:value.id,property:"thresholdRules.0.color"});
  if(baseIcon){const index=layers.findIndex(l=>l.id===id(baseIcon.id));layers.splice(index,1);for(const s of dataSources){const icon={...layer("image"),id:id(baseIcon.id+"-"+s),name:theme+" · "+raw.name+" · "+s+" icon",x:baseIcon.bounds.x,y:baseIcon.bounds.y,w:baseIcon.bounds.width,h:baseIcon.bounds.height,image:iconAssets.get(s),iconMask:true,color:value.color,aod:false,activeVisible:true};if(!icon.image)throw Error("Missing icon for "+s);layers.splice(index,0,icon);c.sourceIcons[s]=[icon.id];colorTargets.push({layerId:icon.id,property:"color"});}}
  control(raw.id+"-color",raw.name+" color","color",value.color,colorTargets);
 }
 const battery=find("battery-value"),meter=find("battery-meter"),group=pkg.thresholds.find(g=>g.id==="battery-zone");const rules=group.bands.map(b=>({...b.min===null?{}:{min:b.min},...b.max===null?{}:{max:b.max},color:b.color}));meter.threshold=true;meter.thresholdRules=structuredClone(rules);meter.thresholdFallback=group.fallbackColor;
 control("battery-color","Battery normal color","color",rules[2].color,[{layerId:battery.id,property:"color"},{layerId:battery.id,property:"thresholdRules.2.color"},{layerId:meter.id,property:"color"},{layerId:meter.id,property:"thresholdRules.2.color"}]);
 control("time-color","Time color","color",find("time-main").color,[{layerId:find("time-main").id,property:"color"}]);
 for(const [key,label] of [["bg-art","Background"],["ticks","Outer ring"],["seconds","Seconds"]])if(find(key))control("show-"+key,label,"boolean",true,[{layerId:find(key).id,property:"activeVisible"}]);
 const zones=layers.filter(l=>l.id.startsWith(id("hr-zone-")));for(const l of zones)l.visibility={source:"heartRate",min:0,minExclusive:true,missingVisible:false,aod:"hide"};if(zones.length)control("show-zone-decoration","Static zone decoration","boolean",true,zones.map(l=>({layerId:l.id,property:"activeVisible"})));
 if(theme==="apex"){find("aod-hr-label").x=264;find("aod-hr-label").textAlign="left";changes.push("apex: AOD unit moved to avoid collision with three-digit HR");}
 p.layers.push(...layers);p.controls.push(...controls);p.themes.presets.push({id:theme,name:pkg.name,version:"1.0.0",backgroundColor:pkg.canvas.background,layerIds:layers.map(l=>l.id),controlIds:controls.map(c=>c.id)});
}
// Validate without retaining the importer's fresh IDs.
validateProject(p);
await mkdir(resolve(root,"generated"),{recursive:true});await writeFile(resolve(root,"generated/project.json"),JSON.stringify(p,null,2)+"\n");
await writeFile(resolve(root,"generated/conversion-report.json"),JSON.stringify({state:"editable-study-native-acceptance-pending",themes:p.themes.presets.map(t=>t.id),layers:p.layers.length,controls:p.controls.length,localFonts:p.localFonts.length,changes,limitations:["Static outer ring and ECG decoration remain static","No hardware acceptance claimed","Not automatically published into default library"]},null,2)+"\n");
await mkdir("frontend/public/design-studies",{recursive:true});await writeFile("frontend/public/design-studies/native454.json",JSON.stringify(p));console.log("Native454 one project:",p.layers.length,"layers,",p.controls.length,"controls,",p.themes.presets.length,"themes");
