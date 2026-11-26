import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const root='resources/examples/reference-release/';
const schemaRoot='resources/schemas/';
const schemas=await Promise.all(['reference-release.schema.json','reference-release-design.schema.json','reference-release-cases.schema.json'].map(n=>read(schemaRoot+n)));
const ajv=new Ajv2020({strict:true,allowUnionTypes:true,allErrors:true});
const validators=schemas.map(s=>ajv.compile(s));
const manifest=await read(root+'publish.json'),design=await read(root+'design.json'),cases=await read(root+'cases.json');
test('draft package example validates against all three structural schemas',()=>{for(const [i,value] of [manifest,design,cases].entries())assert.equal(validators[i](value),true,JSON.stringify(validators[i].errors));});
test('package structure rejects native modes, traversal, forged identity and incompatible versions',()=>{
 for(const mutate of [p=>p.generation.mode='native',p=>p.origin.publisherId='other',p=>p.files[0].path='../escape.json',p=>p.files[0].path='C:/escape.json',p=>p.formatVersion=2,p=>p.version='01.0.0',p=>p.compatibility.targets.push(p.compatibility.targets[0])]){const copy=structuredClone(manifest);mutate(copy);assert.equal(validators[0](copy),false);}
 for(const mutate of [p=>p.files.push({path:'source/app.mc',content:'code'}),p=>p.schemaVersion=27,p=>p.layers[0].image='data:secret',p=>p.layers[0].effectPrompt='generate unsupported runtime code',p=>p.multiDevice={}]){const copy=structuredClone(design);mutate(copy);assert.equal(validators[1](copy),false);}
});
test('example file inventory, hashes, preview pixels and case identities are consistent',async()=>{
 const names=await readdir(root);assert.deepEqual(new Set(names.filter(n=>n!=='publish.json')),new Set(manifest.files.map(f=>f.path)));assert.equal(new Set(manifest.files.map(f=>f.path.toLowerCase())).size,manifest.files.length);
 for(const f of manifest.files){const bytes=await readFile(root+f.path);assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);if(f.role==='preview'){assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),454);assert.equal(bytes.readUInt32BE(20),454);}}
 assert.equal(manifest.name,design.name);assert.equal(manifest.compatibility.targets[0].target,design.target);assert.equal(cases.cases.length,2);for(const c of cases.cases){assert.deepEqual(c.expect.visibleLayerIds,[design.layers[0].id]);assert.equal(c.expect.readings[design.layers[0].id],'09:41');}
});
test('OpenAPI local references, operation IDs, path parameters and credential boundaries are coherent',async()=>{
 const api=await read(schemaRoot+'reference-publishing.openapi.json');assert.equal(api.openapi,'3.1.0');const ids=new Set();
 function walk(v){if(!v||typeof v!=='object')return;if(v.$ref){assert.ok(v.$ref.startsWith('#/'));let target=api;for(const part of v.$ref.slice(2).split('/'))target=target?.[part.replaceAll('~1','/').replaceAll('~0','~')];assert.ok(target,'Missing '+v.$ref);}for(const child of Object.values(v))walk(child);}
 walk(api);
 for(const [path,item] of Object.entries(api.paths))for(const op of Object.values(item)){assert.ok(op.operationId);assert.ok(!ids.has(op.operationId));ids.add(op.operationId);const params=(op.parameters||[]).filter(p=>p.in==='path');assert.deepEqual(new Set([...path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1])),new Set(params.map(p=>p.name)));if(path.startsWith('/api/internal/'))assert.notDeepEqual(op.security??api.security,[]);else assert.deepEqual(op.security,[]);}
 assert.equal(api.paths['/api/internal/reference-publications'].post.requestBody.content['multipart/form-data'].schema.additionalProperties,false);
});

test('deterministic-v1 rejects rotations and implicit heart decoration before submission',()=>{
 const rotated=structuredClone(design);rotated.layers[0].rotation=30;assert.equal(validators[1](rotated),false);
 const heart=structuredClone(design);heart.layers[0].kind='metric';heart.layers[0].source='heartRate';assert.equal(validators[1](heart),false);heart.layers[0].metricDecoration=true;assert.equal(validators[1](heart),false);heart.layers[0].metricDecoration=false;assert.equal(validators[1](heart),true,JSON.stringify(validators[1].errors));
 const unsupported=structuredClone(heart);unsupported.layers[0].source='stress';assert.equal(validators[1](unsupported),false);
 const meter=structuredClone(design);meter.layers[0].kind='meter';meter.layers[0].source='calories';assert.equal(validators[1](meter),false);meter.layers[0].source='battery';assert.equal(validators[1](meter),true);
});
