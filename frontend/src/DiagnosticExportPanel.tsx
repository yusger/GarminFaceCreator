import {useState} from "react";
import type {Project} from "./domain";
import type {Preview} from "./Scene";
import {createDiagnosticBundle,type DiagnosticOptions} from "./diagnosticExport";
import {readRequestHistory} from "./aiRequestHistory";
import {download} from "./storage";
export default function DiagnosticExport({project,secrets,logs,preview,mode}:{project:Project;secrets:string[];logs?:string;preview:Preview;mode:"active"|"aod"}){
 const [options,setOptions]=useState<DiagnosticOptions>({includeDesign:false,includeRequest:false,includePreview:false});
 const [error,setError]=useState("");
 const [showPreview,setShowPreview]=useState(false);
 function prepare(){return createDiagnosticBundle(project,options,{secrets,logs,requests:readRequestHistory(),preview,mode,browser:navigator.userAgent});}
 function exportNow(){try{const {bundle}=prepare();download("gfc-diagnostic.json",bundle);setError("");}catch(e){setError((e as Error).message);}}
 return <details className="boundary-warning" data-diagnostic-export><summary>导出本地诊断包</summary><p className="hint">默认仅导出版本、生成检查与当前项目匹配的编译日志。不上传服务器、不调用模型。包含的设计文字和请求可能有个人内容，请先预览再分享；素材及源码正文不包含，诊断包不能代替项目备份。</p>
 {([["includeDesign","包含当前设计结构（不含图片与字体文件）"],["includeRequest","包含最近一次请求（可能属于其他项目）"],["includePreview","包含当前预览样本和模式"]] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={options[key]} onChange={e=>setOptions({...options,[key]:e.target.checked})}/>{label}</label>)}
 <details onToggle={e=>setShowPreview(e.currentTarget.open)}><summary>预览导出内容</summary><pre style={{maxHeight:240,overflow:"auto",whiteSpace:"pre-wrap"}}>{showPreview?(()=>{try{return prepare().json;}catch(e){return (e as Error).message;}})():null}</pre></details>
 <button type="button" onClick={exportNow}>下载诊断包 JSON</button>{error&&<p role="alert">{error}</p>}</details>;
}
