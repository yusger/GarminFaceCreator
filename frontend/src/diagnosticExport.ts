import type {Project} from "./domain";
import type {Preview} from "./Scene";
import {capabilityVersion} from "./capabilities";
import {deviceMetadataVersion} from "./deviceMetadata";
import {LOCAL_GENERATOR_VERSION} from "./localGenerator";
import {DESIGN_PROMPT_VERSION,CHAT_PROMPT_VERSION,type RequestSnapshot} from "./aiRequestHistory";
import {generationDiagnostics} from "./generationDiagnostics";
import {redactRepair} from "./repair";
export type DiagnosticOptions={includeDesign:boolean;includeRequest:boolean;includePreview:boolean};
export type DiagnosticContext={secrets:string[];logs?:string;requests?:RequestSnapshot[];preview?:Preview;mode?:"active"|"aod";browser?:string;now?:number};
// Whitelisted envelope plus recursive defense. Never export raw files, binary resources or history.
export function diagnosticSafe(value:unknown,secrets:string[],depth=0):unknown{
 if(depth>32) return "[DEPTH OMITTED]";
 if(typeof value==="string"){
  const stripped=value.replace(/data:[^\s"'<>]+/gi,"[DATA OMITTED]").replace(/https?:\/\/[^\s"'<>]+/gi,"[URL OMITTED]");
  const safe=redactRepair(stripped,secrets).replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,"[IP OMITTED]");
  return safe.length>16000?safe.slice(0,16000)+"[TEXT TRUNCATED]":safe;
 }
 if(Array.isArray(value))return value.slice(0,1000).map(v=>diagnosticSafe(v,secrets,depth+1));
 if(value && typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([k])=>!/(?:authorization|api.?key|password|secret|access.?token)/i.test(k) && (depth===0 || !/^(?:image|data|assets|files|versions|designSnapshots|endpoint|image_url)$/i.test(k))).map(([k,v])=>[redactRepair(k,secrets).slice(0,128),diagnosticSafe(v,secrets,depth+1)]));
 return value;
}
export function createDiagnosticBundle(p:Project,options:DiagnosticOptions,context:DiagnosticContext){
 const issues=generationDiagnostics(p);
 const design=options.includeDesign?{backgroundColor:p.backgroundColor,layers:p.layers,controls:p.controls,controlValues:p.controlValues,multiDevice:p.multiDevice,layoutGuide:p.layoutGuide}:undefined;
 // Only the explicitly chosen latest request is included; old unrelated requests are excluded.
 const request=options.includeRequest?context.requests?.slice(-1)[0]:undefined;
 const bundle=diagnosticSafe({format:"gfc-local-diagnostic",formatVersion:1,created:context.now??Date.now(),
 versions:{project:p.schemaVersion,capabilities:capabilityVersion,generator:LOCAL_GENERATOR_VERSION,deviceMetadata:deviceMetadataVersion,designPrompt:DESIGN_PROMPT_VERSION,chatPrompt:CHAT_PROMPT_VERSION},
 project:{id:p.id,name:p.name,target:p.target||"venu445mm",deviceSize:p.deviceSize,revision:p.revision,codeRevision:p.codeRevision,codeProvenance:p.codeProvenance,layerCount:p.layers.length,sourceFiles:p.files.map(f=>({path:f.path,characters:f.content.length})),resourceCount:p.assets?.length||0},
 environment:{browser:context.browser},testState:{browserPreview:"not a device verification",sdk:"not inferred; inspect supplied matching task logs",simulator:"not inferred",hardware:"unverified"},
 diagnostics:issues,logs:context.logs?.slice(-24000),design,request,
 preview:options.includePreview?{mode:context.mode,data:context.preview}:undefined,
 scope:{design:options.includeDesign,latestRequest:!!request,preview:options.includePreview,sourceContents:false,images:false,fontBytes:false,history:false,automaticUpload:false},
 limitations:["This is a diagnostic report, not an importable project backup. Omitted resources may be needed to reproduce rendering.","Redaction is a helper. Review the local JSON before sharing; included text and request bodies can contain personal design information."]},context.secrets);
 const json=JSON.stringify(bundle,null,2);if(new TextEncoder().encode(json).length>1024*1024)throw Error("诊断包超过1MiB，请取消包含设计或请求后重试。");return {bundle,json};
}
