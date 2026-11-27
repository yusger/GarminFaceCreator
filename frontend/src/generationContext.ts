import type {Project,CodeFile,CodeProvenance} from "./domain";
import {capabilityVersion} from "./capabilities";
import {sourceContractVersion} from "./sourceAdapters";
import {deviceMetadataVersion} from "./deviceMetadata";
import {generationDevice} from "./devices";
import {generationDiagnostics} from "./generationDiagnostics";
import {contextIdentity} from "./localIdentity";
export {contextIdentity} from "./localIdentity";
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
export function currentGenerationContext(p:Project) {
  try {return p.codeRevision===p.revision && !!p.codeProvenance?.context && JSON.stringify(p.codeProvenance.context)===JSON.stringify(generationContext(p,p.files));}
  catch {return false;}
}
export function currentApproximationReceipt(p:Project) {
  const receipt=p.codeProvenance?.acceptedApproximations;
  return receipt?.decision==="apply-generated-code" && Array.isArray(receipt.items) && receipt.items.every(i=>i && typeof i.code==="string" && typeof i.path==="string" && typeof i.message==="string") && currentGenerationContext(p);
}
