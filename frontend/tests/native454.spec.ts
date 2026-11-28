import {bitmapFontInfo,usedBitmapFonts} from "../src/bitmapFonts";
import {nativeFontBindings,mergeNativeFonts} from "../src/nativeFontResources";
import {iconMaskId} from "../src/iconMasks";
import {test,expect} from "@playwright/test";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {validateProject} from "../src/domain";
import {resolveControls,setControl} from "../src/projectControls";
import {selectTheme} from "../src/themes";
import {localGenerate} from "../src/localGenerator";
import {chalkPlans} from "../src/chalkFonts";
async function fixture(){return JSON.parse(await readFile("resources/default-watchfaces/trail/design.json","utf8"));}
test("Native454 is one maintainable project with complete presets and local original fonts",async()=>{const p=await fixture();validateProject(p);expect(p.themes.presets.map(t=>t.id)).toEqual(["apex","trail","vital"]);expect(p.controls).toHaveLength(37);expect(p.localFonts).toHaveLength(2);expect(p.layers.length).toBeLessThan(200);const files=localGenerate(p);expect(files.some(f=>f.path==="source/GfcThemeSettings.mc")).toBe(true);expect(chalkPlans(p).every(f=>p.localFonts.some(font=>font.file===f.font))).toBe(true);for(const id of ["apex","trail","vital"]){const r=resolveControls(selectTheme(p,id));expect(r.layers.some(l=>l.id.startsWith(id+"_"))).toBe(true);expect(r.layers.every(l=>l.id.startsWith(id+"_"))).toBe(true);}});
test("data slots preserve original precision and update active/AOD labels with selected source",async()=>{let p=await fixture();p=selectTheme(p,"trail");expect(resolveControls(p).layers.find(l=>l.id==="trail_value_trail_tr").precision).toBe(1);const slot=p.controls.find(c=>c.id==="trail-value-trail-tr");p=setControl(p,slot.id,"heartRate");const r=resolveControls(p);expect(r.layers.find(l=>l.id==="trail_value_trail_tr").source).toBe("heartRate");expect(r.layers.find(l=>l.id==="trail_aod_distance").source).toBe("heartRate");expect(r.layers.find(l=>l.id==="trail_label_trail_tr").text).toBe("BPM");expect(r.layers.find(l=>l.id==="trail_aod_km").text).toBe("BPM");});

test("source icon alternatives share six native glyph resources across themes",async()=>{const p=await fixture(),icons=p.layers.filter(l=>l.iconMask);expect(icons).toHaveLength(60);expect(new Set(icons.map(iconMaskId)).size).toBe(6);const xml=localGenerate(p).find(f=>f.path==="resources/fonts/fonts.xml")!.content;expect((xml.match(/id="GfcMask_/g)||[])).toHaveLength(6);});


test("113 Native454 creates one project, prepares complete resources and runs SDK simulator",async({page,request})=>{
 test.skip(process.env.GFC_NATIVE_TEST!=="1","Explicit complete native test");test.setTimeout(300000);page.on("dialog",dialog=>dialog.accept());
 await page.goto("/");await page.getByRole("button",{name:"使用 trail",exact:true}).click();
 await expect(page.getByRole("button",{name:"本地生成（试验）",exact:true})).toBeVisible();
 await page.locator(".watchface-controls > summary").click();
 for(const id of ["apex","trail","vital"]){await page.getByLabel("主题预设",{exact:true}).selectOption(id);await expect(page.getByRole("button",{name:"本地生成（试验）",exact:true})).toBeVisible();}
 await page.getByLabel("主题预设",{exact:true}).selectOption("apex");
 await page.getByRole("button",{name:"本地生成（试验）",exact:true}).click();
 await page.getByRole("button",{name:"应用生成结果",exact:true}).click();
 const wait=page.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/api/builds"));
 await page.getByRole("button",{name:"编译",exact:true}).first().click();
 const response=await wait;expect(response.status()).toBe(202);const job=await response.json(),headers={Authorization:"Bearer "+job.accessToken};
 await expect.poll(async()=>{const state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();if(state.status==="failed"){const logs=await(await request.get(`/api/builds/${job.buildId}/logs`,{headers})).json();throw Error(JSON.stringify(logs));}return state.status;},{timeout:120000,intervals:[1000]}).toBe("succeeded");
 const root=`/api/builds/${job.buildId}/native-verification`;
 const start=await request.post(root,{headers});expect(start.status()).toBe(202);
 await expect.poll(async()=>{const state=await(await request.get(root,{headers})).json();if(state.status==="failed")throw Error(JSON.stringify(state));return state.status;},{timeout:170000,intervals:[2000]}).toBe("succeeded");
 await mkdir("Temp/native454-validation",{recursive:true});
 const png=await(await request.get(root+"/artifacts/screen.png",{headers})).body();expect(png.readUInt32BE(16)).toBe(454);
 await writeFile("Temp/native454-validation/native-apex.png",png);
 const meta=await(await request.get(root+"/artifacts/metadata.json",{headers})).json();await writeFile("Temp/native454-validation/metadata.json",JSON.stringify(meta,null,2));
 await page.screenshot({path:"Temp/native454-validation/browser.png"});
});


test("113 trail uses the protected default reference card and creates editable three-theme copies",async({page})=>{
 await page.goto("/");const button=page.getByRole("button",{name:"使用 trail",exact:true});await expect(button).toBeVisible();
 const card=button.locator("xpath=ancestor::*[contains(@class,'project-card')][1]");
 await expect(page.getByRole("button",{name:/Native 454 三主题/})).toHaveCount(0);
 await button.click();await expect(page.getByRole("button",{name:"本地生成（试验）",exact:true})).toBeVisible();
 await page.locator(".watchface-controls > summary").click();
 for(const id of ["apex","trail","vital"]){await page.getByLabel("主题预设",{exact:true}).selectOption(id);await expect(page.getByLabel("主题预设",{exact:true})).toHaveValue(id);}
 await expect(page.getByText("已保存到本机",{exact:true})).toBeVisible();
});


test("complete native themes keep font resource references temporary and share text paint code",async()=>{const p=await fixture(),s=localGenerate(p).find(f=>f.path==="source/App.mc")!.content;expect(s).toContain("function fontFor(id){return WatchUi.loadResource(id);}");expect(s).not.toContain("var fonts={}");expect(s).toContain("textPaint(dc,");expect(s.match(/function textPaint/g)).toHaveLength(1);expect(s.length).toBeLessThan(260000);});


test("AI engineering receives exact managed native fonts without font bytes or duplicate declarations",async()=>{const p=await fixture(),bindings=nativeFontBindings(p);expect(bindings.length).toBeGreaterThan(20);const id=bindings[0].activeFontId,files=mergeNativeFonts(p,[{path:"resources/fonts/fonts.xml",content:`<fonts><font id="${id}" filename="bad.fnt"/></fonts>`}]);expect(files.find(f=>f.path==="resources/fonts/fonts.xml")!.content).toBe("<fonts></fonts>");const managed=files.find(f=>f.path.endsWith("gfc-managed-fonts.xml"))!.content;expect(managed).toContain(id);expect(managed.match(new RegExp(`id="${id}"`,"g"))).toHaveLength(1);expect(JSON.stringify(bindings)).not.toContain("base64");});


test("default reference copies may keep Chinese metadata names without imposing canvas glyph requirements",async()=>{const p=await fixture();p.name="trail 副本";const files=localGenerate(p);expect(files.find(f=>f.path==="resources/strings/strings.xml")!.content).toContain("trail 副本");});

test("trail preserves authored TEMP/BPM default labels while alternatives remain linked in browser and native",async()=>{let p=await fixture();p=selectTheme(p,"trail");const slot=p.controls.find(c=>c.targets.some(t=>t.layerId==="trail_value_trail_tl"));expect(resolveControls(p).layers.find(l=>l.id==="trail_label_trail_tl").text).toBe("TEMP");p=setControl(p,slot.id,"heartRate");expect(resolveControls(p).layers.find(l=>l.id==="trail_label_trail_tl").text).toBe("BPM");p=setControl(p,slot.id,"temperature");expect(resolveControls(p).layers.find(l=>l.id==="trail_label_trail_tl").text).toBe("TEMP");p=selectTheme(p,"vital");const heart=p.controls.find(c=>c.targets.some(t=>t.layerId==="vital_heart_big"));expect(resolveControls(p).layers.find(l=>l.id==="vital_aod_hr_cap").text).toBe("BPM");p=setControl(p,heart.id,"steps");expect(resolveControls(p).layers.find(l=>l.id==="vital_aod_hr_cap").text).toBe("DAILY STEPS");const code=localGenerate(p).find(f=>f.path==="source/App.mc")!.content;expect(code).toContain('"BPM"');expect(code).toContain('"TEMP"');const glyphs=chalkPlans(p).map(x=>x.glyphs).join("")+usedBitmapFonts(p).flatMap(f=>Object.values(bitmapFontInfo(f).glyphs).map(g=>String.fromCodePoint(g.id))).join("");for(const c of "BPM")expect(glyphs).toContain(c);expect(p.layers.find(l=>l.id==="vital_aod_hr_cap").text).toBe("BPM");expect(resolveControls(setControl(p,heart.id,"heartRate")).layers.find(l=>l.id==="vital_aod_hr_cap").text).toBe("BPM");});
