// Explicit operator audit; never run by the normal test suite. Requires a previously configured browser profile.
import {build} from "vite";
import {chromium} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
if(process.env.GFC_PAID_REFERENCE_AUDIT!=="1"||!process.env.GFC_TEST_URL||!process.env.GFC_PAID_AUDIT_DIR)throw Error("Explicit paid-audit opt-in, staging URL and resumable Temp directory required");
const url=new URL(process.env.GFC_TEST_URL);
if(!/^(127\.|localhost$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)||url.username||url.password)throw Error("Only an explicitly selected private test origin is supported");
const dir=path.resolve(process.env.GFC_PAID_AUDIT_DIR),tmp=path.resolve("Temp");
if(!dir.startsWith(tmp+path.sep))throw Error("Private results must remain in ignored Temp");
await fs.mkdir(dir,{recursive:true});
const write=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2)+"\n");
const exists=async p=>!!(await fs.stat(path.join(dir,p)).catch(()=>null));
const read=async p=>JSON.parse(await fs.readFile(path.join(dir,p),"utf8"));
const hash=x=>createHash("sha256").update(x).digest("hex");
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const result=await build({configFile:false,logLevel:"silent",define:{"process.env.NODE_ENV":JSON.stringify("production")},build:{write:false,minify:false,lib:{entry:"frontend/tests/fixtures/paidReferenceHarness.ts",name:"GfcPaidAudit",formats:["iife"]}}});
const entry=(Array.isArray(result)?result[0]:result).output.find(f=>f.type==="chunk"&&f.isEntry);
const browser=await chromium.launchPersistentContext(path.join(process.env.LOCALAPPDATA,"GarminFaceCreator","Browser"),{channel:process.env.PLAYWRIGHT_CHANNEL||"msedge",headless:true});
const summary=[];
try{
 const page=await browser.newPage();await page.goto(url.origin);await page.addScriptTag({content:entry.code});
 const protectedPaths=new Set(await page.evaluate(()=>window.gfcPaidReference.managedRepairPaths));
 const descriptors=await page.evaluate(()=>window.gfcPaidReference.referenceAttributions.map(x=>({slug:x.template,name:x.name,id:x.id})));
 if(process.env.GFC_PAID_AUDIT_PREFLIGHT==="1"){
  const preflight=await page.evaluate(async()=>{const h=window.gfcPaidReference,profile=h.readProfiles().find(p=>(p.provider==="deepseek"||p.url.includes("deepseek"))&&p.key);if(!profile)throw Error("Stored DeepSeek profile missing");const references=[];for(const d of h.referenceAttributions){const p=h.copyReference(await h.loadReferencePackage(d),d.name),device=h.generationDevice(p);p.target=device.target;p.deviceSize=device.size;references.push({slug:d.template,name:p.name,target:p.target,layers:p.layers.length,files:p.files.length,preservedFonts:h.preservedFontBindings(p).map(f=>({path:f.path,resourceIds:f.resourceIds}))});}return {model:profile.model,references,paidCalls:0};});
  await write("preflight.json",preflight);console.log(JSON.stringify(preflight));
 }else{
 const only=process.env.GFC_PAID_AUDIT_ONLY?.split(",");
 for(const descriptor of descriptors.filter(x=>!only||only.includes(x.slug))){
  const slug=descriptor.slug;await fs.mkdir(path.join(dir,slug),{recursive:true});
  const record={slug,name:descriptor.name,status:"started",calls:[],sdk:"unverified",native:"unverified",visual:"unverified",hardware:"unverified"};
  console.log("AUDIT_START "+slug);
  try{
   if(await exists(slug+"/result.json")){const old=await read(slug+"/result.json");if(process.env.GFC_PAID_AUDIT_CONTINUE_FAILURES!=="1"||old.status==="runtime-passed-visual-pending"){summary.push(old);console.log("AUDIT_RESUME_COMPLETED "+slug+" "+old.status);continue;}}
   let previous;
   let project;
   if(await exists(slug+"/project.json"))project=await read(slug+"/project.json");
   else{project=await page.evaluate(async descriptor=>{const h=window.gfcPaidReference,d=h.referenceAttributions.find(x=>x.id===descriptor.id);const p=h.copyReference(await h.loadReferencePackage(d),descriptor.name),device=h.generationDevice(p);p.target=device.target;p.deviceSize=device.size;return p;},descriptor);await write(slug+"/input.json",project);}
   async function call(kind,round,diagnostics="",paths=[]){
    const label=kind+"-"+round,base=slug+"/"+label;
    if(await exists(base+"-started.json")&&!(await exists(base+".json")))throw Error("An earlier model request has unknown outcome; no duplicate paid request is issued");
    if(await exists(base+".json")){const saved=await read(base+".json");if(saved.error)throw Error(saved.error);return saved.project;}
    await write(base+"-started.json",{kind,round,at:new Date().toISOString(),authorization:"Current Plan only: user explicitly permits paid reference audit; original roots and counts are retained"});
    const usage=[],pending=[];
    const listener=r=>{if(r.request().method()==="POST")pending.push((async()=>{try{const b=await r.json();if(b.usage)usage.push({status:r.status(),usage:b.usage,finishReason:b.choices?.[0]?.finish_reason});}catch{}})());};
    page.on("response",listener);let answer;
    try{answer=await page.evaluate(async({project,kind,paths,diagnostics})=>{
     const h=window.gfcPaidReference,profile=h.readProfiles().find(p=>(p.provider==="deepseek"||p.url.includes("deepseek"))&&p.key);
     if(!profile)throw Error("Existing configured DeepSeek profile missing");
     let count,root;if(kind==="repair"){root=h.repairRoot(project);const key=h.repairBudgetKey(project);count=(Number(localStorage.getItem(key))||0)+1;localStorage.setItem(key,String(count));}
     try{const files=kind==="generation"?await h.generate({...profile,tokens:32768},project,"Generate this complete default reference design faithfully using its supplied editable layers/assets and real device data. Preserve exact geometry, all data bindings, custom fonts, icons, colors, themes/configuration and low-power behavior. One valid SDK9.3 watchface. Do not substitute an image-only screenshot, omit layers, invent APIs, replace provided bitmap fonts with system fonts or use fixed fake sensor readings. Respect the actual VM memory budget and supplied managed helper contracts. This is a paid native engineering audit, not design creation.",AbortSignal.timeout(600000)):await h.repairCode({...profile,tokens:32768},project,paths,diagnostics,AbortSignal.timeout(600000));
      return {project:h.addCodeVersion(project,files,{...project.codeProvenance,primary:"ai",...(root?{repairRootId:root}:{})}),model:profile.model,round:count,root};
     }catch(e){return {error:h.redactRepair(e.message,[profile.key]),model:profile.model,round:count,root};}
    },{project,kind,paths,diagnostics});}finally{page.off("response",listener);await Promise.all(pending);await write(base+"-usage.json",usage);}
    await write(base+".json",answer);record.calls.push({kind,round,usage});if(answer.error)throw Error(answer.error);return answer.project;
   }
   if(!(await exists(slug+"/project.json"))){project=await call("generation",0);await write(slug+"/project.json",project);}
   let firstRound=0;
   if(process.env.GFC_PAID_AUDIT_CONTINUE_FAILURES==="1"&&await exists(slug+"/result.json")){
    previous=await read(slug+"/result.json");for(const file of ["native.png","watchface.prg"]){if(await exists(slug+"/"+file))await fs.copyFile(path.join(dir,slug,file),path.join(dir,slug,Date.now()+"-before-continuation-"+file));}await write(slug+"/result-before-continuation-"+Date.now()+".json",previous);
    const oldRounds=(await fs.readdir(path.join(dir,slug))).flatMap(f=>{const m=f.match(/^repair-(\d+)\.json$/);return m?[Number(m[1])]:[];});
    firstRound=Math.max(previous.repairs||0,...oldRounds)+1;record.repairs=previous.repairs||0;
    let diagnostics="";
    if(previous.native==="failed"&&await exists(slug+"/native.json"))diagnostics=(await read(slug+"/native.json")).report?.logs||previous.nativeError||"Native failed";
    else if(await exists(slug+"/compile-"+(previous.repairs||0)+".json"))diagnostics=((await read(slug+"/compile-"+(previous.repairs||0)+".json")).logs.lines||[]).filter(x=>x.includes("ERROR")).join("\n");
    const categories=new Set();diagnostics=diagnostics.split("\n").filter(line=>{const key=line.replace(/:[0-9]+,[0-9]+:/g,":LINE:");if(categories.has(key))return false;categories.add(key);return true;}).join("\n").slice(0,10000);
    const guidance=await fs.readFile(path.join(dir,slug,"operator-guidance.txt"),"utf8").catch(()=>"");
    const allowed=f=>/^source\/.*\.mc$/.test(f.path)&&!/^source\/Gfc(BitmapText|FrameReporter|Weather|Icons|Moon|WordTime)\.mc$/.test(f.path);
    const sources=project.files.filter(allowed).map(f=>f.path);
    const mentioned=[...diagnostics.matchAll(/((?:source|resources)\/[\w/.-]+\.(?:mc|xml|svg|fnt))/g)].map(m=>m[1]).filter(p=>project.files.some(f=>f.path===p));
    const main=sources.filter(p=>/View|WatchFace/.test(p));
    const resources=/font|bitmap|resource|resolve/i.test(diagnostics+" "+guidance)?project.files.filter(f=>/^resources\/.*\.xml$/.test(f.path)&&!f.path.includes("settings/")&&!f.path.includes("gfc-managed")&&!f.path.includes("gfc-library")).map(f=>f.path).sort((a,b)=>Number(b.includes("drawables"))-Number(a.includes("drawables"))):[];
    const selected=[...new Set([...mentioned,...main,...resources,...sources])].filter(p=>!protectedPaths.has(p)&&!/^resources\/fonts\/GfcLibrary_/.test(p)).slice(0,5);
    project=await call("repair",firstRound,diagnostics+"\nOperator diagnostics: "+guidance+"\nUse small unique exact edits only, not complete file rewrites. Fix the ROOT type or null handling rather than dozens of callers. Preserve live data and exact design; no fixed fake readings, removed layers or system-font substitutions. Use Lang.Numeric for helpers accepting both integer and float coordinates. Gregorian.info supplies calendar fields; ClockTime supplies only time. Keep original repair root/counter; this additional Plan-only round is explicitly authorized.",selected);await write(slug+"/project.json",project);
   }
   const lastRound=Number(process.env.GFC_PAID_AUDIT_LAST_REPAIR||4);
   if(!Number.isInteger(lastRound)||lastRound<firstRound||lastRound>100)throw Error("Invalid explicit last repair round");
   let lastSignature="",unchangedErrors=0;
   for(let round=firstRound;round<=lastRound;round++){
    const attempt=slug+"/compile-"+round;let job;
    if(await exists(attempt+"-private-job.json"))job=await read(attempt+"-private-job.json");
    else{const submitted=await page.evaluate(async p=>{const h=window.gfcPaidReference,f=new FormData();f.append("project",JSON.stringify({projectId:p.id,projectName:p.name,target:p.target,appId:p.appId,revision:p.revision}));for(const file of await h.preparedCodeFiles(p))f.append("files",new Blob([file.content]),file.path);for(const a of await h.preparedAssets(p))f.append("files",await(await fetch(a.data)).blob(),a.path);const r=await fetch("/api/builds",{method:"POST",body:f});return {status:r.status,job:await r.json(),fileCount:f.getAll("files").length};},project);if(submitted.status!==202)throw Error("SDK submission "+submitted.status+": "+(submitted.job.error||"rejected"));job=submitted.job;await write(attempt+"-private-job.json",job);}
    const root=url.origin+"/api/builds/"+job.buildId,headers={Authorization:"Bearer "+job.accessToken};
    const get=async suffix=>{const r=await fetch(root+suffix,{headers});if(!r.ok)throw Error("Audit API "+r.status);return r;};
    const poll=async suffix=>{for(let i=0;i<180;i++){const s=await(await get(suffix)).json();if(["succeeded","failed","cancelled"].includes(s.status))return s;await delay(1000);}throw Error("Verification deadline exceeded; existing job retained");};
    const compiled=await poll(""),logs=await(await get("/logs")).json();await write(attempt+".json",{compiled,logs});record.sdk=compiled.status;record.repairs=round;
    if(compiled.status!=="succeeded"){
     if(round===lastRound){record.status="sdk-failed";break;}
     const seen=new Set();const lines=(logs.lines||[]).filter(x=>x.includes("ERROR")).filter(x=>{const key=x.replace(/:[0-9]+,[0-9]+:/g,":LINE:");if(seen.has(key))return false;seen.add(key);return true;});
     const signature=lines.map(x=>x.replace(/:[0-9]+,[0-9]+:/g,":LINE:")).sort().join("\n");unchangedErrors=signature===lastSignature?unchangedErrors+1:0;lastSignature=signature;if(unchangedErrors>=2){record.status="sdk-failed-no-progress";break;}
     const selected=[...new Set(lines.flatMap(l=>[...l.matchAll(/((?:source|resources)\/[\w/.-]+\.(?:mc|xml|svg|fnt))/g)].map(m=>m[1])))].filter(path=>project.files.some(f=>f.path===path)&&!protectedPaths.has(path)&&!['source/GfcBitmapText.mc','source/GfcFrameReporter.mc','source/GfcWeather.mc','source/GfcIcons.mc'].includes(path)).slice(0,5);
     if(!selected.length){record.status="sdk-failed-no-repairable-selected-files";break;}
     project=await call("repair",round+1,lines.join("\n").slice(0,14000)+"\nUse SDK9.3 exact APIs and provided managed resource IDs. Prefer small unique exact edits, preserve all geometry and live data. No full project rewrite or managed helper modification. Current Plan operator audit allows further paid repair while normal UI remains max2.",selected);await write(slug+"/project.json",project);continue;
    }
    const bytes=Buffer.from(await(await get("/artifacts/watchface.prg")).arrayBuffer());await fs.writeFile(path.join(dir,slug,"watchface.prg"),bytes);record.prg={bytes:bytes.length,sha256:hash(bytes)};
    let native;if(await exists(slug+"/native.json")){const old=await read(slug+"/native.json");if(old.prgSha256===record.prg.sha256&&old.buildId===job.buildId)native=old;else await write(slug+"/native-before-continuation-"+Date.now()+".json",old);}if(!native){
     const r=await fetch(root+"/native-verification",{method:"POST",headers});if(r.status!==202)throw Error("Native submission "+r.status+": "+(await r.text()).slice(0,250));native=await poll("/native-verification");await write(slug+"/native-"+round+".json",native);await write(slug+"/native.json",native);
    }
    record.native=native.status;record.nativeError=native.error;record.cleanup=native.report?.cleanupStatus;record.dataMode=native.report?.dataMode;record.sourceSha256=native.sourceSha256;
    if(native.status==="succeeded")await fs.writeFile(path.join(dir,slug,"native.png"),Buffer.from(await(await get("/native-verification/artifacts/screen.png")).arrayBuffer()));
    const preview={time:"12:34",seconds:56,calendarDate:"2026-11-28",utcOffsetMinutes:0,heartRate:80,steps:4500,battery:50,values:{heartRate:80,steps:4500,battery:50}};
    try{const shot=await page.evaluate(({project,preview})=>window.gfcPaidReference.captureWatchface(project,preview,false),{project,preview});await fs.writeFile(path.join(dir,slug,"web-reference.png"),Buffer.from(shot.data.split(",")[1],"base64"));await write(slug+"/web-reference.json",{...shot,data:undefined,comparisonPolicy:"Reference only: native data/time not synchronized, no fidelity metric claimed"});}catch{record.webCapture="failed";}
    record.status=native.status==="succeeded"?"runtime-passed-visual-pending":"native-failed";break;
   }
  }catch(e){record.status="failed";record.error=String(e.message).replace(/\bsk-[A-Za-z0-9_-]+/g,"[REDACTED]").slice(0,500);}
  // Complete call accounting on resume as well, without storing request headers or profile secrets.
  const callFiles=(await fs.readdir(path.join(dir,slug))).filter(x=>x.endsWith("-usage.json"));record.calls=await Promise.all(callFiles.map(async file=>({file,usage:await read(slug+"/"+file)})));
  await write(slug+"/result.json",record);summary.push(record);await write("summary.json",summary);console.log("AUDIT_RESULT "+slug+" "+record.status+" repairs="+(record.repairs||0));
 }
 await write("summary.json",summary);
 }
}finally{await browser.close();}
