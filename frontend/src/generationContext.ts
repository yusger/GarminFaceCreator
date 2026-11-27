import type {Project,CodeFile,CodeProvenance} from "./domain";
import {capabilityVersion} from "./capabilities";
import {sourceContractVersion} from "./sourceAdapters";
import {deviceMetadataVersion} from "./deviceMetadata";
import {generationDevice} from "./devices";
import {generationDiagnostics} from "./generationDiagnostics";
// Local change identities, not cryptographic evidence or authorization tokens.
// Native verification independently binds actual source/PRG with server SHA256.
function canonical(v:unknown):unknown {
  if(Array.isArray(v))return v.map(canonical);
  if(v && typeof v === "object")return Object.fromEntries(Object.entries(v).filter(([k,x])=>x!==undefined && k!=="readoutSample").sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)]));
  return v;
}
export function contextIdentity(v:unknown) {
  const text=JSON.stringify(canonical(v));let a=2166136261,b=0x9e3779b9;
  for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822519);}
  return "local-v1:"+(a>>>0).toString(16).padStart(8,"0")+(b>>>0).toString(16).padStart(8,"0")+":"+text.length;
}
export function generationContext(p:Project,files:CodeFile[]) {
  const device=generationDevice(p);
  const variant=p.multiDevice?.variants.find(v=>v.target===device.target && v.deviceSize===p.deviceSize);
  return {version:1 as const,identityPolicy:"local-change-detection-not-security" as const,projectId:p.id,revision:p.revision,target:device.target,deviceSize:device.size,
    capabilityVersion,sourceContractVersion,deviceMetadataVersion,
    masterFingerprint:contextIdentity({layers:p.multiDevice?.master||p.layers,controls:p.controls,background:p.backgroundColor}),
    variantFingerprint:contextIdentity({layers:p.layers,overrides:variant?.overrides,values:p.controlValues,target:device.target,size:device.size}),
    codeFingerprint:contextIdentity([...files].sort((a,b)=>a.path.localeCompare(b.path)))};
}
export function bindGenerationContext(p:Project,files:CodeFile[],provenance:CodeProvenance):CodeProvenance {
  const context=generationContext(p,files);
  const {acceptedApproximations,...rest}=provenance;
  return {...rest,context,...(acceptedApproximations && JSON.stringify(provenance.context)===JSON.stringify(context)?{acceptedApproximations}:{})};
}
export function acceptGeneratedProvenance(p:Project,files:CodeFile[],provenance:CodeProvenance):CodeProvenance {
  const bound=bindGenerationContext(p,files,provenance);
  if(provenance.primary!=="deterministic")return bound;
  const items=generationDiagnostics(p).filter(d=>d.status==="approximation").map(({code,path,layerId,message})=>({code,path,layerId,message}));
  return {...bound,...(items.length?{acceptedApproximations:{decision:"apply-generated-code" as const,at:Date.now(),items}}:{})};
}
export function currentApproximationReceipt(p:Project) {
  const provenance=p.codeProvenance;
  if(!provenance?.acceptedApproximations || !provenance.context)return false;
  return JSON.stringify(provenance.context)===JSON.stringify(generationContext(p,p.files));
}
