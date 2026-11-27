import { fontMaskPng } from "../../src/fontMaskPng";
import { createBitmapFontAsset } from "../../src/bitmapFonts";
import { project, layer } from "../../src/domain";
import { bitmapLayerPatch } from "../../src/bitmapFontLayout";
export async function typographyFixture(target = "venu445mm") {
  const chars = [..."0123456789:AV- .,"],
    rgba = new Uint8ClampedArray(128 * 16 * 4);
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  const advance = (c: string) =>
    c === "1" ? 3 : /[0-9]/.test(c) ? 7 : c === "A" || c === "V" ? 6 : 3;
  const descriptor = `info face="GFC Synthetic Typography" size=12 unicode=1
common lineHeight=14 base=11 scaleW=128 scaleH=16 pages=1 packed=0
page id=0 file="typography.png"
chars count=${chars.length}
${chars.map((c, i) => `char id=${c.codePointAt(0)} x=${i * 5} y=0 width=${c === " " ? 0 : 4} height=${c === " " ? 0 : 9} xoffset=0 yoffset=1 xadvance=${advance(c)} page=0 chnl=15`).join("\n")}
kernings count=2
kerning first=49 second=58 amount=-1
kerning first=65 second=86 amount=-2
`;
  const f = createBitmapFontAsset(
      descriptor,
      await fontMaskPng(128, 16, rgba),
      "Original synthetic GFC metrics test glyphs, CC0-1.0",
    ),
    p = project("BitmapTypography", true);
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  p.bitmapFonts = [f];
  p.layers = [
    {
      ...layer("text"),
      id: "digits",
      name: "Digits",
      text: "11:11",
      x: 70,
      y: 150,
      w: 170,
      h: 40,
      color: "#55AAFF",
      ...bitmapLayerPatch(p, f.id),
    },
    {
      ...layer("text"),
      id: "unit",
      name: "Unit",
      text: "AV",
      x: 270,
      y: 250,
      w: 90,
      h: 40,
      color: "#FF77BB",
      ...bitmapLayerPatch(p, f.id),
    },
  ];
  return p;
}
