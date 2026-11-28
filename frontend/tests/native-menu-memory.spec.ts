import {test,expect} from '@playwright/test';import {readFile} from 'node:fs/promises';import {nativeThemeMenu,colorPalette} from '../src/nativeThemeMenu';import {sourceCode,controlSettingKey} from '../src/nativeSettingIds';import {themeBackground,themeBackgroundKey} from '../src/themes';
test('shared menu lists preserve each control key, source code, palette and order',async()=>{
 const p=JSON.parse(await readFile('resources/default-watchfaces/trail/design.json','utf8')),code=nativeThemeMenu(p)[0].content;
 const lists=[...code.matchAll(/addValues\(("[^"\n]+"),(.+?),\[([^\n]*?)\]\);/g)].map(m=>new Function('return ['+m[1]+','+m[2]+',['+m[3]+']]')());
 for(const c of p.controls){const list=lists.find(a=>a[0]===controlSettingKey(c));expect(list).toBeTruthy();const entries=c.type==='boolean'?[true,false]:c.type==='color'?[...new Set([p.controlValues?.[c.id]??c.default,c.default,...colorPalette])]:c.options;expect(list[1]).toEqual(entries.map((v:any)=>c.type==='boolean'?(v?'On':'Off'):String(v)));expect(list[2]).toEqual(entries.map((v:any)=>c.type==='dataSource'?sourceCode(v):c.type==='color'?parseInt(v.slice(1),16):v));}
 for(const t of p.themes.presets){const list=lists.find(a=>a[0]===themeBackgroundKey(t.id));expect(list[1]).toEqual([...new Set([themeBackground(p,t.id),t.backgroundColor,'#000000',...colorPalette])]);}
 expect(lists).toHaveLength(p.controls.length+p.themes.presets.length);expect(code.length).toBeLessThan(26000);
});
