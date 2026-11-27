import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp,cp,readFile,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateWidgetPackage } from "./validate-widget-package.mjs";
const sample="resources/default-controls/examples/battery-capsule";
test("standard package validates and unsafe/ambiguous contracts are rejected",async()=>{
 assert.equal((await validateWidgetPackage(sample)).layers,3);
 for(const mutate of [p=>p.layers[0].x=-1,p=>p.layers[1].id=p.layers[0].id,p=>p.layers[2].source="heartRate",p=>p.parameters[0].default="#FFFFFF",p=>p.layers[0].script="alert(1)",p=>p.requirements=[]]) {
  const dir=await mkdtemp(join(tmpdir(),"gfc-widget-"));await cp(sample,dir,{recursive:true});
  const p=JSON.parse(await readFile(join(dir,"widget.json"),"utf8"));mutate(p);await writeFile(join(dir,"widget.json"),JSON.stringify(p));
  await assert.rejects(()=>validateWidgetPackage(dir));
 }
});

test('four admitted widget packages satisfy the shared contract',async()=>{for(const id of ['capsule-metric','segment-battery','vitals-column','stack-tiers']) assert.equal((await validateWidgetPackage('resources/default-controls/widgets/'+id)).id,id);});

test('instrument packages use the existing declared package contract',async()=>{for(const id of ['activity-rings','weather-band','battery-dial','analog-subdial']) assert.equal((await validateWidgetPackage('resources/default-controls/widgets/'+id)).id,id);});
