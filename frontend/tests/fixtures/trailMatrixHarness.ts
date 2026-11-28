// Explicit fixed-data drawing fixture. Forced AOD is NOT a lifecycle or hardware test.
import type {Project} from '../../src/domain';import {projectForDevice,deviceKey} from '../../src/multiDevice';import {localGenerate} from '../../src/localGenerator';import {themeBackground} from '../../src/themes';import {preparedCodeFiles} from '../../src/chalkFonts';import {preparedAssets} from '../../src/iconLibrary';import {captureWatchface} from '../../src/watchfaceCapture';
export const matrixScenarios=[
 {id:'normal',aod:false,heartRate:72,steps:4500,battery:78,calories:426,distance:3.5,temperature:24,seconds:30},
 {id:'aod',aod:true,heartRate:72,steps:4500,battery:78,calories:426,distance:3.5,temperature:24,seconds:0},
 {id:'high',aod:false,heartRate:160,steps:123456,battery:9,calories:9876,distance:123.45,temperature:-12.3,seconds:59},
 {id:'missing',aod:false,heartRate:null,steps:null,battery:null,calories:null,distance:null,temperature:null,seconds:0}
];
export function fixture(input:Project,nonce:string,target:string){
 if(!/^[a-f0-9]{32}$/.test(nonce)||!['venu445mm','venu441mm'].includes(target))throw Error('Explicit bounded matrix identity/target required');
 const p=projectForDevice(input,deviceKey({target,deviceSize:target==='venu445mm'?'45mm':'41mm'}));p.id=nonce;p.appId=nonce;
 const phase='gfcMatrixPhase',scene='(gfcMatrixPhase%4)',bg=p.themes!.presets.map(t=>parseInt(themeBackground(p,t.id).slice(1),16));
 p.files=localGenerate(p).map(f=>{if(f.path!=='source/App.mc')return f;let s=f.content;
 const anchor=' function onUpdate(dc as Graphics.Dc) as Void {';
 if(!s.includes(anchor)||!s.includes('  frameContext=null;'))throw Error('Matrix generator anchor changed');
 s=s.replace('var gfcFrameReported=false;','var gfcFrameReported=false;var gfcMatrixStart=-1;var gfcMatrixPhase=-1;var gfcMatrixLogged=-1;var gfcMatrixSec=0;');
 s=s.replace(anchor,anchor+'if(gfcMatrixStart<0){gfcMatrixStart=System.getTimer();}gfcMatrixPhase=((System.getTimer()-gfcMatrixStart)/4000).toNumber();if(gfcMatrixPhase>11){gfcMatrixPhase=11;}sleeping=('+scene+'==1);gfcMatrixSec='+scene+'==2?59:('+scene+'==0?30:0);');
 const assignments=Object.keys(matrixScenarios[0]).filter(k=>!['id','aod','seconds'].includes(k)).map(key=>{const values=matrixScenarios.map(c=>(c as any)[key]);return 'data'+key+'='+JSON.stringify(values)+'['+scene+'];';}).join('');
 const paint='var bg=sleeping?Graphics.COLOR_BLACK:';if(!s.includes(paint))throw Error('Matrix paint anchor changed');s=s.replace(paint,'cfgTheme=(gfcMatrixPhase/4).toNumber();cfgThemeBackground='+JSON.stringify(bg)+'[cfgTheme];'+assignments+paint);
 s=s.replace(/\bcalendar\.day_of_week\b/g,'(7)').replace(/\bcalendar\.day\b/g,'(28)').replace(/\bcalendar\.month\b/g,'(11)').replace(/\bclock\.hour\b/g,'(9)').replace(/\bclock\.min\b/g,'(41)').replace(/\bclock\.sec\b/g,'gfcMatrixSec');
 if(s.includes('var dateText='))s=s.replace('var bg=sleeping?', 'dateText="SAT 28";var bg=sleeping?');
 const report='  if(!gfcFrameReported){System.println(';if(!s.includes(report))throw Error('Matrix report anchor changed');s=s.replace(report,'  if(gfcMatrixLogged!=gfcMatrixPhase){gfcMatrixLogged=gfcMatrixPhase;var mem=System.getSystemStats();System.println("GFC_MATRIX_FRAME="+gfcMatrixPhase+" vm="+mem.usedMemory+"/"+mem.totalMemory);}'+report);
 s=s.replace('if(!gfcFrameReported){System.println(','if(!gfcFrameReported){System.println("GFC_THEME_UI_VALIDATION=1");System.println("GFC_THEME_UI_RUN='+nonce+'");System.println("GFC_CONTROLLED_TRAIL_MATRIX=1 forcedAod=true fixedData=true");System.println(').replace(/(local generator basic-[a-z0-9-]+)/,'$1-matrix-fixture');return {...f,content:s};});return p;
}
async function captures(p:Project){const shots=[];for(let themeIndex=0;themeIndex<3;themeIndex++)for(let scene=0;scene<4;scene++){const c=matrixScenarios[scene],q=structuredClone(p);q.themes!.activeId=q.themes!.presets[themeIndex].id;const data={time:'09:41',calendarDate:'2026-11-28',utcOffsetMinutes:0,heartRate:c.heartRate??NaN,steps:c.steps??NaN,battery:c.battery??NaN,seconds:c.seconds,missing:c.id==='missing',values:{heartRate:c.heartRate,steps:c.steps,battery:c.battery,calories:c.calories,distance:c.distance,temperature:c.temperature}};const shot=await captureWatchface(q,data,c.aod);shots.push({index:themeIndex*4+scene,theme:q.themes!.activeId,scenario:c.id,aod:c.aod,data,shot});}return shots;}
Object.assign(window,{gfcTrailMatrix:{fixture,captures,preparedCodeFiles,preparedAssets}});
