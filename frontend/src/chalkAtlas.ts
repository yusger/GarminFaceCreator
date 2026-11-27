import { fontMaskPng } from "./fontMaskPng.ts";
// Native font resource creation from licensed webfonts; no SDK font extraction.
export async function chalkAtlas(
  bytes: ArrayBuffer,
  family: string,
  size: number,
  glyphs: string,
  filename: string,
) {
  const face = await new FontFace(family, bytes).load();
  document.fonts.add(face);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${size}px "${family}"`;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    const chars = [...new Set([...glyphs])],
      metrics = chars.map((c) => ctx.measureText(c));
    const ascent = Math.ceil(
        Math.max(...metrics.map((m) => m.actualBoundingBoxAscent)),
      ),
      descent = Math.ceil(
        Math.max(...metrics.map((m) => m.actualBoundingBoxDescent)),
      ),
      height = ascent + descent + 2;
    let x = 0,
      y = 0;
    const records = [];
    for (let i = 0; i < chars.length; i++) {
      const m = metrics[i],
        left = Math.ceil(m.actualBoundingBoxLeft),
        right = Math.ceil(m.actualBoundingBoxRight),
        width = Math.max(1, left + right + 2);
      if (width > 512) throw Error("Font glyph too wide");
      if (x + width > 512) {
        x = 0;
        y += height;
      }
      if (y + height > 2048) throw Error("Font atlas too large");
      ctx.fillText(chars[i], x + left + 1, y + ascent + 1);
      records.push(
        `char id=${chars[i].codePointAt(0)} x=${x} y=${y} width=${width} height=${height} xoffset=${-left - 1} yoffset=0 xadvance=${Math.max(1, Math.round(m.width))} page=0 chnl=15`,
      );
      x += width;
    }
    const cropped = document.createElement("canvas");
    cropped.width = 512;
    cropped.height = y + height;
    cropped.getContext("2d")!.drawImage(canvas, 0, 0);
    return {
      content: `info face="${family}" size=${size} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0\ncommon lineHeight=${height} base=${ascent + 1} scaleW=512 scaleH=${cropped.height} pages=1 packed=0\npage id=0 file="${filename}"\nchars count=${chars.length}\n${records.join("\n")}\n`,
      data: await fontMaskPng(cropped.width,cropped.height,cropped.getContext("2d")!.getImageData(0,0,cropped.width,cropped.height).data),
    };
  } finally {
    document.fonts.delete(face);
  }
}
