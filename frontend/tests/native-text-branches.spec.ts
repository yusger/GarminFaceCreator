import {test,expect} from '@playwright/test';
import {factorNativeTextBranches} from '../src/nativeTextBranches';
const call=(text:string,font='F')=>`GfcBitmapText.drawDetailed(dc,1,2,30,40,${font},"font",${text},"center",0,false,2,0);`;
test('factored bitmap branches retain formatting, threshold paint and missing text',()=>{
 const branches=['{var value=read();paint(value<120?1:2);'+call('format(value,"a,b",[1,2])')+'}', 'paint(3);'+call('""')];
 const factored=factorNativeTextBranches(branches)!;expect(factored).not.toBeNull();
 for(let i=0;i<branches.length;i++)for(const input of [null,0,119,120,160]){
  const run=(code:string)=>{let events:any[]=[];new Function('dc','F','read','paint','format','GfcBitmapText',code)({},42,()=>input,(v:any)=>events.push(['paint',v]),(v:any,s:any,a:any)=>JSON.stringify([v,s,a]),{drawDetailed:(...args:any[])=>events.push(['draw',...args])});return events;};
  expect(run('var gfcSlotText=null;'+factored.branches[i]+'if(gfcSlotText!=null){'+factored.call+'}')).toEqual(run(branches[i]));
 }
});
test('different font, geometry, trailing effects, nonterminal or empty branches remain independent',()=>{
 for(const branches of [[call('"a"'),call('"b"','Other')],[call('"a"'),call('"b"').replace(',30,',',31,')],[call('"a"')+'paint(2);',call('"b"')],[call('"a"'),''],[call('"a"')]])expect(factorNativeTextBranches(branches)).toBeNull();
});
