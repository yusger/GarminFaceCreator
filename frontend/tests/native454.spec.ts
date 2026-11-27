import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {validateProject} from "../src/domain";
import {resolveControls,setControl} from "../src/projectControls";
import {selectTheme} from "../src/themes";
import {localGenerate} from "../src/localGenerator";
import {chalkPlans} from "../src/chalkFonts";
async function fixture(){return JSON.parse(await readFile("resources/design-studies/native454/generated/project.json","utf8"));}
test("Native454 is one maintainable project with complete presets and local original fonts",async()=>{const p=await fixture();validateProject(p);expect(p.themes.presets.map(t=>t.id)).toEqual(["apex","trail","vital"]);expect(p.controls).toHaveLength(37);expect(p.localFonts).toHaveLength(2);expect(p.layers.length).toBeLessThan(200);const files=localGenerate(p);expect(files.some(f=>f.path==="source/GfcThemeSettings.mc")).toBe(true);expect(chalkPlans(p).every(f=>p.localFonts.some(font=>font.file===f.font))).toBe(true);for(const id of ["apex","trail","vital"]){const r=resolveControls(selectTheme(p,id));expect(r.layers.some(l=>l.id.startsWith(id+"_"))).toBe(true);expect(r.layers.every(l=>l.id.startsWith(id+"_"))).toBe(true);}});
test("data slots preserve original precision and update active/AOD labels with selected source",async()=>{let p=await fixture();p=selectTheme(p,"trail");expect(resolveControls(p).layers.find(l=>l.id==="trail_value_trail_tr").precision).toBe(1);const slot=p.controls.find(c=>c.id==="trail-value-trail-tr");p=setControl(p,slot.id,"heartRate");const r=resolveControls(p);expect(r.layers.find(l=>l.id==="trail_value_trail_tr").source).toBe("heartRate");expect(r.layers.find(l=>l.id==="trail_aod_distance").source).toBe("heartRate");expect(r.layers.find(l=>l.id==="trail_label_trail_tr").text).toBe("BPM");expect(r.layers.find(l=>l.id==="trail_aod_km").text).toBe("BPM");});
