import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {createDiagnosticBundle} from "../src/diagnosticExport";
import {project,layer} from "../src/domain";
import {insertWidget} from "../src/widgets";
const no={includeDesign:false,includeRequest:false,includePreview:false};
test("diagnostics default to a metadata envelope with no source, resource, request or design content",()=>{
 const p=project("Case",true);p.layers=[{...layer("image"),image:"data:image/png;base64,PRIVATE"}];p.files=[{path:"source/App.mc",content:"PRIVATE_CODE"}];
 const before=JSON.stringify(p),{json,bundle}=createDiagnosticBundle(p,no,{secrets:[],logs:"failed source/App.mc:23",now:123});
 for(const value of ["PRIVATE","PRIVATE_CODE","data:image"])expect(json).not.toContain(value);
 expect(bundle).toMatchObject({formatVersion:1,created:123,scope:{design:false,latestRequest:false,automaticUpload:false},testState:{hardware:"unverified"}});
 expect(json).toContain("source/App.mc");expect(JSON.stringify(p)).toBe(before);
});
test("explicit structure keeps compound identity but excludes binaries and redacts nested keys and endpoints",()=>{
 const p=insertWidget(project("Case",true),"capsule-metric"),key="arbitrary-private-credential-12345";
 p.layers[0].name=key;p.designBrief="not automatically included";
 const request={id:"r",at:1,kind:"chat",promptVersion:"test",capabilityVersion:"test",model:"test",endpoint:"https://user:pass@example.test?api_key=SECRET",status:"failed",request:{password:"BAD",image_url:{url:"data:image/png;base64,HIDDEN"},url:"https://example.test/path?token=BAD",text:key,ip:"113.221.17.172",path:"C:\\Users\\MyPrivateUserXYZ\\secret",[key]:key},error:"Bearer abcdefghijklmnop"} as const;
 const {json,bundle}=createDiagnosticBundle(p,{...no,includeDesign:true,includeRequest:true},{secrets:[key],requests:[{...request,id:"old",error:"OLD_RECORD"},request]});
 for(const value of [key,"SECRET","BAD","HIDDEN","OLD_RECORD","example.test","113.221.17.172","MyPrivateUserXYZ"])expect(json).not.toContain(value);
 expect(bundle).toMatchObject({design:{layers:[{kind:"widget",compound:{version:1}}]},scope:{latestRequest:true}});
});
test("oversize reports fail explicitly instead of silently pretending to be complete",()=>{
 const p=project("Large",true);p.layers=Array.from({length:80},(_,i)=>({...layer("text"),id:"l"+i,text:"x".repeat(15000)}));
 expect(()=>createDiagnosticBundle(p,{...no,includeDesign:true},{secrets:[]})).toThrow(/1MiB/);
});
test("113 local export previews optional scope and downloads without compile or model requests",async({page})=>{
 page.on("dialog",d=>d.accept("Diagnostic"));await page.goto("/");await page.getByRole("button",{name:/^空白画布/}).click();await page.getByRole("button",{name:"创建项目",exact:true}).click();await page.getByRole("button",{name:"时间",exact:true}).click();
 const writes:string[]=[];page.on("request",r=>{if(r.method()==="POST")writes.push(r.url());});
 const panel=page.locator("[data-diagnostic-export]");await panel.locator(":scope > summary").click();for(const box of await panel.getByRole("checkbox").all())await expect(box).not.toBeChecked();
 const a=page.waitForEvent("download");await panel.getByRole("button",{name:"下载诊断包 JSON"}).click();const first=JSON.parse(await readFile(await (await a).path(),"utf8"));expect(first.scope.design).toBe(false);expect(first.design).toBeUndefined();
 await panel.getByLabel("包含当前设计结构（不含图片与字体文件）").check();await panel.getByText("预览导出内容",{exact:true}).click();await expect(panel.locator("pre")).toContainText('"layers"');
 const b=page.waitForEvent("download");await panel.getByRole("button",{name:"下载诊断包 JSON"}).click();const second=JSON.parse(await readFile(await (await b).path(),"utf8"));expect(second.design.layers).toHaveLength(1);expect(second.versions.generator).toContain("basic-");expect(writes).toEqual([]);
});
