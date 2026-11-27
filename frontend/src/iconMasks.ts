import { expandWidgets } from "./compound.ts";
import { generationDevice } from "./devices.ts";
import { fontMaskPng } from "./fontMaskPng.ts";
import type { Project, Layer } from "./domain.ts";
export const iconMaskId = (l: Layer) =>
  "GfcMask_" + l.id.replace(/[^a-zA-Z0-9]/g, "_");
export async function preparedIconMasks(input: Project) {
  const p = expandWidgets(input),
    scale = generationDevice(p).screenWidth / 454,
    files: { path: string; content: string }[] = [],
    assets: { path: string; data: string }[] = [];
  const layers = p.layers.filter(
    (l) => l.kind === "image" && l.iconMask && l.exportIncluded !== false,
  );
  if (layers.length > 96) throw Error("单色图标最多96个");
  for (const l of layers) {
    const w = Math.max(1, Math.round(l.w * scale)),
      h = Math.max(1, Math.round(l.h * scale));
    if (!l.image || l.libraryIcon || w > 128 || h > 128)
      throw Error("单色透明图标需本地位图且目标尺寸不超过128px");
    const image = new Image();
    image.src = l.image;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const dc = canvas.getContext("2d")!;
    dc.drawImage(image, 0, 0, w, h);
    const pixels=dc.getImageData(0,0,w,h).data;for(let i=3;i<pixels.length;i+=4)pixels[i]=Math.round(pixels[i]*(l.opacity??1));
    const id = iconMaskId(l),
      data = await fontMaskPng(w, h, pixels);
    const content = `info face="GfcMask" size=${h}
common lineHeight=${h} base=${h} scaleW=${w} scaleH=${h} pages=1 packed=0
page id=0 file="${id}.png"
chars count=1
char id=65 x=0 y=0 width=${w} height=${h} xoffset=0 yoffset=0 xadvance=${w} page=0 chnl=15
`;
    files.push({ path: "resources/fonts/" + id + ".fnt", content });
    assets.push({ path: "resources/fonts/" + id + ".png", data });
  }
  return { files, assets };
}
