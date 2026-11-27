import {test,expect} from "@playwright/test";
import {inflateSync} from "node:zlib";
import {fontMaskPng} from "../src/fontMaskPng";
import {crc32} from "../src/zip";
test("font mask stores true grayscale coverage with valid PNG chunks and scanlines",async()=>{
 const rgba=new Uint8ClampedArray([255,255,255,0,255,255,255,64,255,255,255,128,255,255,255,255]);
 const png=Buffer.from((await fontMaskPng(2,2,rgba)).split(",")[1],"base64");
 expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
 let offset=8;const idats:Buffer[]=[];const types:string[]=[];
 while(offset<png.length){const size=png.readUInt32BE(offset),name=png.toString("ascii",offset+4,offset+8),data=png.subarray(offset+8,offset+8+size);types.push(name);expect(crc32(png.subarray(offset+4,offset+8+size))).toBe(png.readUInt32BE(offset+8+size));if(name==="IHDR"){expect([...data.subarray(8)]).toEqual([8,0,0,0,0]);expect(data.readUInt32BE(0)).toBe(2);expect(data.readUInt32BE(4)).toBe(2);}if(name==="IDAT")idats.push(data);offset+=size+12;}
 expect(types).toEqual(["IHDR","IDAT","IEND"]);expect([...inflateSync(Buffer.concat(idats))]).toEqual([0,0,64,0,128,255]);
});
test("invalid mask sizes reject before allocation or truncation",async()=>{for(const [w,h,data] of [[0,1,new Uint8ClampedArray()],[513,1,new Uint8ClampedArray(2052)],[1,2049,new Uint8ClampedArray(8196)],[2,1,new Uint8ClampedArray(4)]] as const)await expect(fontMaskPng(w,h,data)).rejects.toThrow(/dimensions/);});
