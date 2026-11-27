import {test,expect} from "@playwright/test";
import {project,layer} from "../src/domain";
import {localGenerate} from "../src/localGenerator";
test("isolated simulator minimal text fixture compiles and downloads",async({request})=>{
 test.skip(process.env.GFC_TEST_SDK!=="1","Explicit staging SDK only");test.setTimeout(130000);
 const p=project("SimulatorMinimal",true);p.layers=[{...layer("time"),garminFont:"small"}];const form=new FormData();form.append("project",JSON.stringify({projectId:p.id,appId:p.appId,target:"venu445mm",revision:p.revision,projectName:p.name}));
 for(const f of localGenerate(p))form.append("files",new Blob([f.content]),f.path);
 const response=await fetch(process.env.GFC_TEST_URL+"/api/builds",{method:"POST",body:form});expect(response.status).toBe(202);const job=await response.json(),headers=job.accessToken?{Authorization:"Bearer "+job.accessToken}:{};let state:any;
 await expect.poll(async()=>{state=await(await request.get(`/api/builds/${job.buildId}`,{headers})).json();return state.status;},{timeout:110000,intervals:[1000]}).toBe("succeeded");
 if(process.env.GFC_TEST_ARTIFACT_DIR){const {mkdir,writeFile}=await import("node:fs/promises"),{join}=await import("node:path");await mkdir(process.env.GFC_TEST_ARTIFACT_DIR,{recursive:true});const artifact=await request.get(state.artifacts[0].url,{headers});expect(artifact.status()).toBe(200);await writeFile(join(process.env.GFC_TEST_ARTIFACT_DIR,"minimal-venu445mm.prg"),await artifact.body());}
});
