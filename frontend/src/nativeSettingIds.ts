import {contextIdentity} from "./localIdentity.ts";
import type {ProjectControl} from "./projectControls.ts";
export const legacySettingKey=(id:string)=>"Gfc_"+id.replaceAll("-","_");
export const controlSettingKey=(c:Pick<ProjectControl,"id"|"type">)=>(c.type==="dataSource"?"Gfc_Source_":"Gfc_")+c.id.replaceAll("-","_");
export const sourceCode=(source:string)=>parseInt(contextIdentity("source:"+source).split(":")[1].slice(0,8),16)&0x7fffffff;
// An undeclared/unselected source uses -1 until first app update. Old indices are consumed once
// into the NEW property key; after that order and removed options cannot reinterpret stored values.
export const nativeSourceSettings=String.raw`
 function gfcSourceSetting(key,legacyKey,legacyChoices,codes,choices,fallback){
  var value=null;try{value=Application.Properties.getValue(key);}catch(e){}
  if(value instanceof Toybox.Lang.Number){for(var i=0;i<codes.size();i++){if(value==codes[i]){return choices[i];}}}
  var result=fallback;
  if(value==null || value==-1){try{var old=Application.Properties.getValue(legacyKey);if(old instanceof Toybox.Lang.Number && old>=0 && old<legacyChoices.size()){var candidate=legacyChoices[old];for(var i=0;i<choices.size();i++){if(choices[i].equals(candidate)){result=candidate;break;}}}}catch(e){}}
  for(var i=0;i<choices.size();i++){if(choices[i].equals(result)){try{Application.Properties.setValue(key,codes[i]);}catch(e){}break;}}return result;
 }
`;
