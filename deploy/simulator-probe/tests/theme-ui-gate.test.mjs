import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
const gitExe=process.platform==='win32'?spawnSync('where.exe',['git'],{encoding:'utf8'}).stdout?.trim().split(/\r?\n/)[0]:undefined;
const gitRoot=gitExe?dirname(dirname(gitExe)):undefined;
const bash=process.platform==='win32'?[process.env.GFC_BASH,...(gitRoot?[join(gitRoot,'bin/bash.exe'),join(gitRoot,'usr/bin/bash.exe')]:[])].find(p=>p&&existsSync(p)):'/bin/bash';
if(!bash)throw Error('Bash is required for probe protocol checks');
const root=resolve(tmpdir()),script=resolve('deploy/simulator-probe/theme-ui-gate.sh').replaceAll('\\','/'),hash='a'.repeat(64);
const run=file=>spawnSync(bash,['-c','set -euo pipefail; source "$1";gfc_ui_hash_request "$2" "$3"','check',script,file.replaceAll('\\','/'),hash],{encoding:'utf8'});
async function scratch(action){const dir=await mkdtemp(join(root,'gfc-theme-ui-'));try{await action(dir);}finally{if(dirname(resolve(dir))!==root||!basename(dir).startsWith('gfc-theme-ui-'))throw Error('Unsafe test cleanup path');await rm(dir,{recursive:true,force:true});}}
test('probe entry and operator module have valid Bash syntax',()=>{for(const file of ['deploy/simulator-probe/run.sh','deploy/simulator-probe/theme-ui-gate.sh']){const r=spawnSync(bash,['-n',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}});
test('completion requests require the exact immutable PRG digest and bounded file content',async()=>{await scratch(async dir=>{const file=join(dir,'request');for(const value of [hash,hash+'\n']){await writeFile(file,value);assert.equal(run(file).status,0);}for(const value of ['',hash+'\r\n',hash+'x',hash+'\n\n','b'.repeat(64),'A'.repeat(64),'$(echo invalid)'.padEnd(64,'a')]){await writeFile(file,value);const r=run(file);assert.equal(r.status,1,value);assert.equal(r.stdout,'');}assert.equal(run(join(dir,'missing')).status,1);});});
test('linked completion files are rejected rather than followed',async t=>{await scratch(async dir=>{const target=join(dir,'target'),link=join(dir,'link');await writeFile(target,hash);try{await symlink(target,link,'file');}catch(e){if(e.code==='EPERM'){t.skip('Host does not allow creating symlinks');return;}throw e;}assert.equal(run(link).status,1);});});

