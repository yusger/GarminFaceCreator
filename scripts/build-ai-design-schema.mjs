import {writeFile,mkdir} from "node:fs/promises";
import {build} from "vite";
// Compile the browser module without starting a development server.
const result=await build({configFile:false,logLevel:"silent",build:{write:false,minify:false,lib:{entry:"frontend/src/aiDesign.ts",formats:["es"]}}});
const bundle=(Array.isArray(result)?result[0]:result).output.find(f=>f.type==="chunk"&&f.isEntry);if(!bundle)throw Error("Schema builder module missing");
const {designResponseSchema,designSources}=await import("data:text/javascript;base64,"+Buffer.from(bundle.code).toString("base64"));
const schema=designResponseSchema({name:"Schema",target:"venu445mm",deviceSize:"45mm",style:"HYBRID",date:true,dateLocale:"en",seconds:true,sources:designSources.map(([id])=>id),instruction:""});
await mkdir("resources/schemas",{recursive:true});await writeFile("resources/schemas/ai-design-response-v1.json",JSON.stringify(schema,null,2)+"\n");console.log("AI response schema generated from shared field types");
