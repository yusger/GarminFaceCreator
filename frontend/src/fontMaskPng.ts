import { crc32 } from "./zip.ts";
// BMFont coverage is stored as an 8-bit grayscale PNG, not white RGB with alpha.
export async function fontMaskPng(width: number, height: number, rgba: Uint8ClampedArray): Promise<string> {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>512||height>2048||rgba.length!==width*height*4) throw Error("Invalid font mask dimensions");
  const raw=new Uint8Array((width+1)*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)raw[y*(width+1)+1+x]=rgba[(y*width+x)*4+3];
  const deflate=new CompressionStream("deflate");
  const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(deflate)).arrayBuffer());
  const chunk=(name:string,data:Uint8Array)=>{const bytes=new Uint8Array(data.length+12),view=new DataView(bytes.buffer);view.setUint32(0,data.length);bytes.set(new TextEncoder().encode(name),4);bytes.set(data,8);view.setUint32(bytes.length-4,crc32(bytes.subarray(4,bytes.length-4)));return bytes;};
  const ihdr=new Uint8Array(13),view=new DataView(ihdr.buffer);view.setUint32(0,width);view.setUint32(4,height);ihdr[8]=8;ihdr[9]=0;
  const chunks=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",compressed),chunk("IEND",new Uint8Array())];
  let encoded="";for(const bytes of chunks)for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return "data:image/png;base64,"+btoa(encoded);
}
