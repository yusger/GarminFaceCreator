// Shared source for maintainer font snapshot tools and isolated browser verification.
import {readFile} from "node:fs/promises";
import {stripTypeScriptTypes} from "node:module";
import {crc32} from "../frontend/src/zip.ts";
export async function fontAtlasBrowserSource(){
 const sources=await Promise.all(["fontMaskPng.ts","chalkAtlas.ts"].map(name=>readFile(new URL("../frontend/src/"+name,import.meta.url),"utf8")));
 return crc32.toString()+"\n"+sources.map(s=>stripTypeScriptTypes(s.replace(/^import .*;\r?\n/gm,"").replace(/export async function/g,"async function"))).join("\n");
}
