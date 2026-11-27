import { fontMaskPng } from "../../src/fontMaskPng";
import { createBitmapFontAsset } from "../../src/bitmapFonts";
import { project, layer } from "../../src/domain";
import { bitmapLayerPatch } from "../../src/bitmapFontLayout";
export const bitmapDescriptor = `info face="GFC Test" size=12 unicode=1
common lineHeight=12 base=10 scaleW=16 scaleH=16 pages=1 packed=0
page id=0 file="fixture.png"
chars count=3
char id=32 x=0 y=0 width=0 height=0 xoffset=0 yoffset=0 xadvance=3 page=0 chnl=15
char id=65 x=0 y=0 width=4 height=12 xoffset=0 yoffset=0 xadvance=6 page=0 chnl=15
char id=86 x=4 y=0 width=4 height=12 xoffset=0 yoffset=0 xadvance=6 page=0 chnl=15
kernings count=2
kerning first=65 second=86 amount=-2
kerning first=86 second=65 amount=-1
`;
export async function bitmapFixture(target = "venu445mm") {
  const rgba = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 8; x++) {
      const i = (y * 16 + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
      rgba[i + 3] = x % 4 === 0 ? 128 : 255;
    }
  const atlas = await fontMaskPng(16, 16, rgba),
    f = createBitmapFontAsset(
      bitmapDescriptor,
      atlas,
      "Original GFC synthetic test glyphs; CC0-1.0",
    ),
    p = project("BitmapFont", true);
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  p.bitmapFonts = [f];
  p.layers = [
    {
      ...layer("text"),
      id: "bitmap-text",
      name: "Bitmap",
      text: "AVA",
      x: 80,
      y: 150,
      w: 250,
      h: 40,
      ...bitmapLayerPatch(p, f.id),
    },
  ];
  return p;
}
