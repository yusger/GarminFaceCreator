import {test,expect} from "@playwright/test";
import {project,layer} from "../src/domain";
import {chatPayload} from "../src/designChat";
import {requestContext} from "../src/requestContext";
import {LOCAL_GENERATOR_VERSION} from "../src/localGenerator";
test("request contexts retain bounded design, device and image identities without raw image bytes",()=>{
 const p=project("Request",true);p.layers=[layer("time")];const payload=chatPayload(p,[]),a=requestContext(payload,[{data:"data:image/png;base64,PRIVATE_PIXELS",mode:"aod"}]);
 expect(a).toMatchObject({version:"request-context-1",target:"venu445mm",width:454,height:454,projectId:p.id,revision:p.revision,imageCount:1,generatorBaselineVersion:LOCAL_GENERATOR_VERSION});
 expect(a.images[0].mode).toBe("aod");expect(JSON.stringify(a)).not.toContain("PRIVATE_PIXELS");expect(a.masterFingerprint).toBeDefined();
 expect(requestContext(chatPayload({...p,updated:123,storageVersion:99},[]),[{data:"data:image/png;base64,PRIVATE_PIXELS",mode:"aod"}])).toEqual(a);
 expect(requestContext(chatPayload({...p,layers:[{...p.layers[0],color:"#123456"}]},[])).inputFingerprint).not.toBe(a.inputFingerprint);
 expect(requestContext({...payload,layoutTemplate:{id:"example",version:"2",layers:["PRIVATE"]}}).template).toEqual({id:"example",version:"2"});
});
