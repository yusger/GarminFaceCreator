import {contextIdentity} from "./localIdentity";
import {LOCAL_GENERATOR_VERSION} from "./localGenerator";
import {GENERATION_FIELD_CONTRACT_VERSION} from "./generationFields";
export type RequestContext={
  version:"request-context-1";identityPolicy:"local-change-detection-not-security";
  inputFingerprint:string;protocol?:string;target?:string;size?:string;width?:number;height?:number;
  projectId?:string;revision?:number;masterFingerprint?:string;variantFingerprint?:string;
  template?:{id:string;version:string|number};generatorBaselineVersion:string;fieldContractVersion:string;
  imageCount:number;images:{fingerprint:string;mode:"active"|"aod"|"unspecified"}[];
};
export function requestContext(payload:unknown,images:{data:string;mode?:"active"|"aod"}[]=[]):RequestContext {
  const p=(payload && typeof payload==="object"?payload:{}) as Record<string,any>,d=p.device||{},identity=p.designIdentity||{},t=p.layoutTemplate;
  return {version:"request-context-1",identityPolicy:"local-change-detection-not-security",inputFingerprint:contextIdentity(payload),
    protocol:typeof p.protocol==="string"?p.protocol:undefined,target:typeof d.target==="string"?d.target:undefined,size:typeof d.size==="string"?d.size:undefined,
    width:Number.isFinite(d.screenWidth)?d.screenWidth:undefined,height:Number.isFinite(d.screenHeight)?d.screenHeight:undefined,
    projectId:identity.projectId,revision:identity.revision,masterFingerprint:identity.masterFingerprint,variantFingerprint:identity.variantFingerprint,
    template:t && typeof t.id==="string" && ["string","number"].includes(typeof t.version)?{id:t.id,version:t.version}:undefined,
    generatorBaselineVersion:LOCAL_GENERATOR_VERSION,fieldContractVersion:GENERATION_FIELD_CONTRACT_VERSION,
    imageCount:images.length,images:images.map(i=>({fingerprint:contextIdentity(i.data),mode:i.mode||"unspecified"}))};
}
