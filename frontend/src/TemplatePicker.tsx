import { layoutTemplates, layoutTemplate } from "./layoutTemplates";
export default function TemplatePicker({value,onChange,label="布局模板"}:{value:string;onChange:(id:string)=>void;label?:string}) {
 const template=layoutTemplate(value);
 return <div className="template-picker"><label>{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">不使用模板</option>{layoutTemplates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.mode==="DIGITAL"?"数字":t.mode==="ANALOG"?"指针":"混合"}</option>)}</select></label>{template&&<figure><img width="160" height="160" src={"/layout-templates/"+template.id+"/preview.svg"} alt={template.name+"模板预览"}/><figcaption>{template.description}</figcaption></figure>}</div>;
}
