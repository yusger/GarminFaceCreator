import {test,expect} from "@playwright/test";
import {project,layer} from "../src/domain";
import {primitiveSampling,primitivePoints,CURVE_ERROR_PX} from "../src/primitiveSampling";
import {localGenerate} from "../src/localGenerator";
import {generationDiagnostics} from "../src/generationDiagnostics";
test("curve sampling follows target pixel error and stays within explicit vertex budgets",()=>{
 const small={...layer("circle"),w:20,h:12},large={...small,w:440,h:220};
 expect(primitiveSampling(small,1).segments).toBeLessThan(primitiveSampling(large,1).segments);
 for(const scale of [390/454,1,480/454])for(const shape of [small,large,{...layer("rect"),w:440,h:440,cornerRadius:220}]){
   const sampled=primitiveSampling(shape,scale),points=primitivePoints(shape,scale);
   expect(points.length).toBeLessThanOrEqual(64);expect(points.length).toBeGreaterThanOrEqual(4);
   expect(sampled.errorPx).toBeLessThanOrEqual(CURVE_ERROR_PX+1e-9);
   for(const [x,y] of points){expect(x).toBeGreaterThanOrEqual(shape.x-1e-8);expect(x).toBeLessThanOrEqual(shape.x+shape.w+1e-8);expect(y).toBeGreaterThanOrEqual(shape.y-1e-8);expect(y).toBeLessThanOrEqual(shape.y+shape.h+1e-8);}
 }
 const extreme={...large,w:4000,h:2000};expect(primitiveSampling(extreme,1).capped).toBe(true);
 const p=project("Budget",true);p.layers=[extreme];expect(generationDiagnostics(p).some(x=>x.code==="CURVE_SUBDIVISION_BUDGET" && x.status==="approximation")).toBe(true);
 expect(primitivePoints({...layer("rect"),cornerRadius:0},1)).toHaveLength(4);
});
for(const [target,size] of [["venu445mm","45mm"],["venu441mm","41mm"]])test(`adaptive geometry SDK ${target}`,async({request})=>{
 test.skip(process.env.GFC_TEST_SDK!=="1","Explicit SDK verification");test.setTimeout(130000);
 const p=project("AdaptiveGeometry",true);p.target=target;p.deviceSize=size;
 p.layers=[{...layer("circle"),x:85,y:95,w:270,h:200,rotation:30,strokeEnabled:true,opacity:0.7,aod:true},{...layer("rect"),x:145,y:165,w:170,h:110,cornerRadius:45,rotation:-15,fillEnabled:false,strokeEnabled:true,aod:true},layer("time")];
 const form=new FormData();form.append("project",JSON.stringify({projectId:p.id,appId:p.appId,target,revision:p.revision,projectName:p.name}));for(const f of localGenerate(p))form.append("files",new Blob([f.content]),f.path);
 const r=await request.post("/api/builds",{multipart:form});expect(r.status()).toBe(202);const job=await r.json();const headers={Authorization:"Bearer "+job.accessToken};
 await expect.poll(async()=>{const state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();if(state.status==="failed")throw Error("Adaptive geometry SDK failed");return state.status;},{timeout:110000,intervals:[1000]}).toBe("succeeded");
});
