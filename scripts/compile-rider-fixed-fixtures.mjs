// Maintainer-only fixed-data render fixtures. Never use these PRGs as a production watchface.
import {readFile,writeFile,access,mkdir} from "node:fs/promises";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
const compile=process.argv.includes("--compile"),base=process.env.GFC_TEST_URL?.replace(/\/$/,""),dir=resolve("Temp/rider-validation"),hash=v=>createHash("sha256").update(v).digest("hex");
if(compile && (!base || !["http:","https:"].includes(new URL(base).protocol) || new URL(base).username || new URL(base).password || new URL(base).pathname!=="/"))throw Error("Set GFC_TEST_URL to the explicit staging origin");
const only=process.argv.find(a=>a.startsWith("--case="))?.slice(7);
if(only && !/^(02|05):venu4(45|41)mm:(active|aod)$/.test(only))throw Error("Invalid explicit fixture case");
await mkdir(dir,{recursive:true});
for(const id of ["02","05"])for(const target of ["venu445mm","venu441mm"]){
 const name=`${id}-${target}`,metadata=JSON.parse(await readFile(join(dir,`submitted-${name}.json`),"utf8")),body=await readFile(join(dir,`submitted-${name}.bin`)),start=metadata.sourceOffset,end=start+metadata.sourceLength,original=body.subarray(start,end).toString("utf8");if(hash(Buffer.from(original))!==metadata.sourceSha256 || !original.startsWith("// GarminFaceCreator local generator "))throw Error("Submitted source mismatch");
 for(const mode of ["active","aod"]){
  if(only && only!==`${id}:${target}:${mode}`)continue;
  const [hour,min]=metadata.fixedPreview.time.split(":").map(Number),sec=metadata.fixedPreview.seconds;
  const clock=`class GfcFrozenClock {var hour=${hour};var min=${min};var sec=${sec};function initialize(){}}\n`;
  let source=original.replace("class GeneratedView extends WatchUi.WatchFace",clock+"class GeneratedView extends WatchUi.WatchFace").replace("var clock=System.getClockTime();","var clock=new GfcFrozenClock();");
  const fixed=`sleeping=${mode==="aod"};dataheartRate=72;datasteps=8420;databattery=78;datacalories=426;var bg=sleeping?`;
  source=source.replace("var bg=sleeping?",fixed);
  if(source===original || !source.includes(fixed) || !/\n \}\n\}$/.test(source))throw Error("Fixture injection guard failed");
  source=source.replace(/\n \}\n\}$/,`\n System.println("GFC_PROBE_FRAME_READY");\n }\n}`);
  const key=`fixed-${id}-${target}-${mode}`,sourceSha256=hash(Buffer.from(source)),record={fixtureVersion:"rider-fixed-render-1",id,target,pixels:metadata.pixels,mode,fixedPreview:{...metadata.fixedPreview,seconds:mode==="aod"?0:sec},sourceSha256,sourceMode:"explicit test-only source injection; AOD draw branch forced, sleep event not verified",hardware:"unverified",notPublished:true};
  await writeFile(join(dir,key+".mc"),source);
  if(!compile){console.log(key+" prepared; not compiled");continue;}
  try{const old=JSON.parse(await readFile(join(dir,key+".json"),"utf8")),prg=await readFile(join(dir,key+".prg"));if(old.sourceSha256===sourceSha256 && old.prgSha256===hash(prg)){console.log(key+" reused verified PRG");continue;}}catch{}
  const upload=Buffer.concat([body.subarray(0,start),Buffer.from(source),body.subarray(end)]),r=await fetch(base+"/api/builds",{method:"POST",headers:{"Content-Type":metadata.contentType},body:upload,redirect:"error",signal:AbortSignal.timeout(30000)});if(r.status!==202)throw Error("Fixture submit HTTP "+r.status);
  const job=await r.json();if(!/^[a-f0-9]{32}$/.test(job.buildId)||!/^[a-f0-9]{64}$/i.test(job.accessToken))throw Error("Invalid protected task response");const headers={Authorization:"Bearer "+job.accessToken};
  let state;for(let i=0;i<110;i++){const poll=await fetch(base+"/api/builds/"+job.buildId,{headers,redirect:"error",signal:AbortSignal.timeout(15000)});if(!poll.ok)throw Error("Fixture poll HTTP "+poll.status);state=await poll.json();if(!["queued","running"].includes(state.status))break;await new Promise(r=>setTimeout(r,1000));}
  if(state?.status!=="succeeded"){const log=await fetch(base+"/api/builds/"+job.buildId+"/logs",{headers,redirect:"error"});throw Error("Fixture SDK "+state?.status+" "+(await log.text()).slice(-2500));}
  const url=new URL(state.artifacts?.[0]?.url,base);if(url.origin!==base || !url.pathname.startsWith("/api/builds/"+job.buildId+"/"))throw Error("Unexpected artifact origin/path");const result=await fetch(url,{headers,redirect:"error",signal:AbortSignal.timeout(15000)});if(!result.ok)throw Error("Artifact HTTP "+result.status);const prg=Buffer.from(await result.arrayBuffer());await writeFile(join(dir,key+".prg"),prg);await writeFile(join(dir,key+".json"),JSON.stringify({...record,prgSha256:hash(prg),sdk:"staging SDK9.3.0; compilation succeeded; runtime not yet verified"},null,2)+"\n");console.log(key+" SDK succeeded; "+prg.length+" bytes");
 }
}
