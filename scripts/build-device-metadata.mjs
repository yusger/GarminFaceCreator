import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {devices} from "../frontend/src/devices.ts";
const directory=process.argv[2];if(!directory)throw Error("Pass the local Connect IQ Devices directory explicitly");
const records=[];
for(const target of [...new Set(devices.map(d=>d.id))]){
 try{
  const compilerBytes=await readFile(join(resolve(directory),target,"compiler.json")),simBytes=await readFile(join(resolve(directory),target,"simulator.json"));
  const c=JSON.parse(compilerBytes),s=JSON.parse(simBytes);
  if(c.deviceId!==target || !Number.isInteger(c.resolution?.width) || !Number.isInteger(c.resolution?.height))throw Error("Device identity/resolution mismatch: "+target);
  records.push({target,status:"sdk-package",source:{compilerFile:target+"/compiler.json",simulatorFile:target+"/simulator.json",compilerSha256:createHash("sha256").update(compilerBytes).digest("hex"),simulatorSha256:createHash("sha256").update(simBytes).digest("hex"),packageVersion:c.deviceVersion},width:c.resolution.width,height:c.resolution.height,shape:s.display?.shape ?? null,displayType:c.displayType ?? null,bitsPerPixel:c.bitsPerPixel ?? null,alphaBlending:c.alphaBlendingSupport ?? null,apiVersions:[...new Set((c.partNumbers || []).map(p=>p.connectIQVersion).filter(Boolean))].sort(),watchFaceMemoryBytes:c.appTypes?.find(a=>a.type==="watchFace")?.memoryLimit ?? null,graphicsPoolBytes:s.graphicsResourcePoolSize ?? null,sensorHistory:[...new Set((s.sensorHistory || []).map(v=>v.type))].sort(),vectorFontFaces:[...new Set((s.fonts||[]).flatMap(set=>set.fonts||[]).filter(f=>f.type==="system_ttf"&&typeof f.name==="string").map(f=>f.name))].sort(),aod:"unverified",hardwareValidation:"unverified"});
 }catch(e){if(e.code!=="ENOENT")throw e;records.push({target,status:"unknown",reason:"Device package not installed",aod:"unverified",hardwareValidation:"unverified"});}
}
await writeFile("resources/devices/sdk-metadata.json",JSON.stringify({version:"sdk-metadata-1-"+createHash("sha256").update(JSON.stringify(records)).digest("hex").slice(0,12),sourcePolicy:"Facts extracted from installed device packages; firmware, hardware and power are not verified. No SDK binaries, fonts or host paths included.",devices:records},null,2)+"\n");
console.log(`Device metadata: ${records.filter(r=>r.status==="sdk-package").length} packages, ${records.filter(r=>r.status==="unknown").length} unknown`);
