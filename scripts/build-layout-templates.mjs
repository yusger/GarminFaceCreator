import Ajv from "ajv";
import { readdir,readFile,writeFile,mkdir,cp } from "node:fs/promises";
import { resolve } from "node:path";
const ajv=new Ajv({strict:false,allErrors:true});
const descriptorSchema=ajv.compile(JSON.parse(await readFile("resources/schemas/layout-template.schema.json","utf8")));
const layoutSchema=ajv.compile(JSON.parse(await readFile("resources/schemas/layout.schema.json","utf8")));
const catalog=[];
for (const item of await readdir("resources/default-watchfaces-template",{withFileTypes:true})) {
 if(!item.isDirectory())continue;
 const dir=resolve("resources/default-watchfaces-template",item.name);
 const descriptor=JSON.parse(await readFile(resolve(dir,"template.json"),"utf8"));
 const layout=JSON.parse(await readFile(resolve(dir,"layout.json"),"utf8"));
 if(!descriptorSchema(descriptor))throw Error("Invalid template metadata: "+JSON.stringify(descriptorSchema.errors));
 if(!layoutSchema(layout))throw Error("Invalid template layers: "+JSON.stringify(layoutSchema.errors));
 if(new Set(layout.layers.map(l=>l.id)).size!==layout.layers.length)throw Error("Duplicate template layer IDs");
 if(descriptor.id!==item.name || descriptor.format!=="gfc-layout-template" || descriptor.formatVersion!==1 || !["DIGITAL","ANALOG","HYBRID"].includes(descriptor.mode) || layout.layers.length>80)throw Error("Invalid layout template: "+item.name);
 for(const file of ["LICENSE","preview.svg","preview-aod.svg"])await readFile(resolve(dir,file));
 await mkdir(resolve("frontend/public/layout-templates",item.name),{recursive:true});
 await cp(dir,resolve("frontend/public/layout-templates",item.name),{recursive:true});
 catalog.push({...descriptor,...layout});
}
await writeFile("frontend/src/layoutTemplateCatalog.json",JSON.stringify(catalog,null,2)+"\n");
console.log("Editable layout templates:",catalog.length);
