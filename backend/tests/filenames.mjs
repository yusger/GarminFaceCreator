import { buildFetch as fetch } from "./build-client.mjs";
import assert from 'node:assert/strict';
import {files} from './fixture.mjs';
const base=process.env.GFC_TEST_URL||'http://localhost:18380';
for(const [target,deviceSize,projectName,expected] of [
 ['venu445mm','45mm','Clown Watch','Venu4_45mm_ClownWatch.prg'],
 ['fenix847mm','51mm','测试 / 表盘:*?','fēnix8AMOLED_51mm_测试_表盘___.prg']
]){
 const form=new FormData();form.append('project',JSON.stringify({projectId:crypto.randomUUID(),appId:'4c3f31fda59c4f9bb25c4f7774eca711',target,revision:0,projectName,deviceSize}));
 for(const [name,content] of Object.entries(files))form.append('files',new Blob([name==='manifest.xml'?content.replaceAll('venu445mm',target):content]),name);
 const response=await fetch(base+'/api/builds',{method:'POST',body:form});assert.equal(response.status,202,await response.clone().text());const job=await response.json();
 for(let i=0;i<180;i++){
 const state=await(await fetch(base+'/api/builds/'+job.buildId)).json();
 if(!['queued','running'].includes(state.status)){
 assert.equal(state.status,'succeeded');assert.equal(state.artifacts[0].fileName,expected);
 const download=await fetch(base+state.artifacts[0].url);assert.equal(download.status,200);
 const disposition=download.headers.get('content-disposition');const encoded=disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];assert.equal(decodeURIComponent(encoded),expected);
 assert.ok((await download.arrayBuffer()).byteLength>500);console.log('PASS named PRG download',expected);break;
 }
 await new Promise(r=>setTimeout(r,1000));if(i===179)throw Error('Timed out');
 }
}
if(process.env.GFC_LEGACY_BUILD_ID){const old=await fetch(base+'/api/builds/'+encodeURIComponent(process.env.GFC_LEGACY_BUILD_ID)+'/artifacts/watchface.prg');assert.equal(old.status,200);await old.arrayBuffer();console.log('PASS old artifact remains downloadable');}
