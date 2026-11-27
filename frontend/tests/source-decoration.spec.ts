import {localGenerate} from "../src/localGenerator";
import {binaryAssets} from "../src/assets";
import {test,expect} from "@playwright/test";
import {project,layer} from "../src/domain";
import {resolveControls,setControl,setSourceDecoration} from "../src/projectControls";
import {nativeControlledDraw} from "../src/nativeControls";
function fixture(){const p=project("Source Icons",true),metric={...layer("metric"),source:"steps",autoSourceFormat:true},icon={...layer("image"),name:"步数图标",aod:true,image:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII="};p.layers=[metric,icon];p.controls=[{id:"data",label:"主数据",type:"dataSource",default:"steps",options:["steps","battery"],targets:[{layerId:metric.id,property:"source"}]}];return p;}
test("explicit source decoration linking hides stale icons in both modes and restores originals",()=>{
 const p=fixture(),original=JSON.stringify(p),q=setSourceDecoration(p,"data",p.layers[1].id,true);
 expect(JSON.stringify(p)).toBe(original);expect(q.revision).toBe(p.revision+1);
 const changed=setControl(q,"data","battery"),resolved=resolveControls(changed);
 expect(resolved.layers[1]).toMatchObject({activeVisible:false,aod:false});expect(resolved.layers[1].image).toBe(p.layers[1].image);
 expect(resolveControls(setControl(changed,"data","steps")).layers[1].aod).toBe(true);
 for(const aod of [false,true])expect(nativeControlledDraw(q,p.layers[1],aod,()=>"DRAW_ICON;")).toContain('cfg_data.equals("steps")');
 expect(setSourceDecoration(q,"data",p.layers[1].id,false).controls![0].hideWhenChangedFromDefault).toBeUndefined();
 expect(()=>setSourceDecoration({...p,layers:p.layers.map(l=>({...l,locked:true}))},"data",p.layers[1].id,true)).toThrow();
 expect(()=>setSourceDecoration({...p,multiDevice:{master:p.layers,scope:"device",variants:[]}},"data",p.layers[1].id,true)).toThrow();
});
test("source decoration policy can be configured on the page without rewriting the image",async({page})=>{
 const p=fixture();await page.goto("/");await page.evaluate(value=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open("garmin-face-creator",2);r.onsuccess=()=>{const db=r.result,tx=db.transaction("projects","readwrite");tx.objectStore("projects").put(value);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),p);
 await page.reload();await page.getByRole("button",{name:"我的表盘",exact:true}).click();await page.getByRole("button",{name:"打开 Source Icons",exact:true}).click();
 await page.locator("details.watchface-controls > summary").click();await page.locator("[data-source-decoration] > summary").click();
 await page.getByLabel("切换主数据时隐藏步数图标",{exact:true}).check();await page.getByLabel("主数据",{exact:true}).selectOption("battery");
 await expect(page.getByText("已保存到本机",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"我的表盘",exact:true}).click();await page.getByRole("button",{name:"打开 Source Icons",exact:true}).click();
 await page.locator("details.watchface-controls > summary").click();await page.locator("[data-source-decoration] > summary").click();await expect(page.getByLabel("切换主数据时隐藏步数图标",{exact:true})).toBeChecked();await expect(page.getByLabel("主数据",{exact:true})).toHaveValue("battery");
});

for(const [target,size] of [["venu445mm","45mm"],["venu441mm","41mm"]])test(`source decoration AOD SDK ${target}`,async({request})=>{
 test.skip(process.env.GFC_TEST_SDK!=="1","Explicit SDK verification");test.setTimeout(130000);
 let p=fixture();p.target=target;p.deviceSize=size;p=setSourceDecoration(p,"data",p.layers[1].id,true);
 const form=new FormData();form.append("project",JSON.stringify({projectId:p.id,appId:p.appId,target,revision:p.revision,projectName:p.name}));for(const f of localGenerate(p))form.append("files",new Blob([f.content]),f.path);for(const a of binaryAssets(p))form.append("files",new Blob([Buffer.from(a.data.split(",")[1],"base64")]),a.path);
 const r=await request.post("/api/builds",{multipart:form});expect(r.status()).toBe(202);const job=await r.json(),headers={Authorization:"Bearer "+job.accessToken};await expect.poll(async()=>{const state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();if(state.status==="failed")throw Error("Source decoration SDK failed");return state.status;},{timeout:110000,intervals:[1000]}).toBe("succeeded");
});
