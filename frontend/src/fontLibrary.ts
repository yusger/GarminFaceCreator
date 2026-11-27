import catalog from "../../resources/shared/fonts/catalog.json" with {type:"json"};
import type { Layer } from "./domain";
export const libraryFonts = catalog;
export function fontPatch(id: string): Partial<Layer> {
  const font = catalog.find((f) => f.id === id);
  if (!font) throw Error("字体不存在");
  return {
    bitmapFontId:undefined,
    garminFont: id === "chalk" || id === "chalkHan" ? id : "auto",
    customFont:
      id === "chalk" || id === "chalkHan"
        ? undefined
        : { id: font.id, family: font.family, file: font.file },
  };
}
// Read Unicode cmap; unlike browser fallback this checks the actual font glyph mapping.
export function missingGlyphs(bytes: ArrayBuffer, text: string): string[] {
  const v = new DataView(bytes);
  const tables = v.getUint16(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const at = 12 + i * 16;
    if (v.getUint32(at) === 0x636d6170) cmap = v.getUint32(at + 8);
  }
  if (cmap < 0) throw Error("字体无Unicode字符表");
  const maps: number[] = [];
  for (let i = 0; i < v.getUint16(cmap + 2); i++) {
    const at = cmap + 4 + i * 8,
      platform = v.getUint16(at),
      encoding = v.getUint16(at + 2),
      sub = cmap + v.getUint32(at + 4),
      format = v.getUint16(sub);
    if (
      (platform === 0 ||
        (platform === 3 && (encoding === 1 || encoding === 10))) &&
      (format === 4 || format === 12)
    )
      maps.push(sub);
  }
  if (!maps.length) throw Error("暂不支持该字体字符表格式");
  const has = (s: number, cp: number) => {
    if (v.getUint16(s) === 12) {
      let lo = 0,
        hi = v.getUint32(s + 12) - 1;
      while (lo <= hi) {
        const m = (lo + hi) >>> 1,
          at = s + 16 + m * 12,
          a = v.getUint32(at),
          b = v.getUint32(at + 4);
        if (cp < a) hi = m - 1;
        else if (cp > b) lo = m + 1;
        else return v.getUint32(at + 8) + cp - a !== 0;
      }
      return false;
    }
    if (cp > 65535) return false;
    const n = v.getUint16(s + 6) / 2,
      end = s + 14,
      start = end + n * 2 + 2,
      delta = start + n * 2,
      ranges = delta + n * 2;
    for (let i = 0; i < n; i++) {
      if (cp > v.getUint16(end + i * 2)) continue;
      const a = v.getUint16(start + i * 2);
      if (cp < a) return false;
      const d = v.getInt16(delta + i * 2),
        r = v.getUint16(ranges + i * 2);
      if (!r) return ((cp + d) & 65535) !== 0;
      const glyph = v.getUint16(ranges + i * 2 + r + (cp - a) * 2);
      return glyph !== 0 && ((glyph + d) & 65535) !== 0;
    }
    return false;
  };
  return [...new Set([...text])].filter(
    (c) => !/[\n\r\t]/.test(c) && !maps.some((s) => has(s, c.codePointAt(0)!)),
  );
}
