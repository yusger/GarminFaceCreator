import {test,expect} from "@playwright/test";
import {project} from "../src/domain";
import {localGenerate} from "../src/localGenerator";
import {mergeNativeFrameReporter,frameReporterPath} from "../src/nativeFrameReporter";
import {repairPayload} from "../src/repair";
test("AI reporter composes the original view and has explicit distinct provenance",()=>{const p=project("Report",true),files=localGenerate(p);const result=mergeNativeFrameReporter(p,files),code=result.find(f=>f.path===frameReporterPath)!.content;expect(result.find(f=>f.path==="manifest.xml")!.content).toContain('entry="GfcReportedApp"');expect(code).toContain("managed AI frame reporter ai-frame-1");expect(code.indexOf("inner.onUpdate(dc)")).toBeLessThan(code.indexOf("GFC_RENDER_READY"));expect(code).toContain("inner.onEnterSleep()");expect(mergeNativeFrameReporter(p,result)).toEqual(result);const bad=files.map(f=>f.path==="manifest.xml"?{...f,content:'<application entry="OtherApp"/>'}:f);expect(()=>mergeNativeFrameReporter(p,bad)).toThrow("GeneratedApp");p.files=result;expect(()=>repairPayload(p,[frameReporterPath],"",{key:"",url:"https://example.com",model:"test"} as any)).toThrow();});
