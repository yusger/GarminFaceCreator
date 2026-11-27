import { contextIdentity } from "./localIdentity.ts";
import { crc32 } from "./zip.ts";
import type { Project, Layer, CodeFile } from "./domain.ts";
import { generationDevice } from "./devices.ts";
import { expandWidgets } from "./compound.ts";
import { requiredFontGlyphs } from "./fontGlyphs.ts";
export type BitmapFontAsset = {
  id: string;
  family: string;
  descriptor: string;
  atlasData: string;
  license: string;
  source: string;
};
export type BitmapGlyph = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  page: number;
  chnl: number;
};
export type BitmapFontInfo = {
  family: string;
  size: number;
  lineHeight: number;
  base: number;
  width: number;
  height: number;
  page: string;
  glyphs: Record<number, BitmapGlyph>;
  kernings: { first: number; second: number; amount: number }[];
};
const cache = new Map<
  string,
  { descriptor: string; data: string; info: BitmapFontInfo }
>();
const identity = (descriptor: string, data: string) =>
  "bitmap_" +
  contextIdentity({ descriptor, data })
    .replace(/[^a-f0-9]/g, "")
    .padEnd(32, "0")
    .slice(0, 32);
const int = (
  o: Record<string, string>,
  key: string,
  min: number,
  max: number,
) => {
  const v = Number(o[key]);
  if (o[key] === undefined || !Number.isSafeInteger(v) || v < min || v > max)
    throw Error("FNT字段越界：" + key);
  return v;
};
export function parseBitmapFont(text: string): BitmapFontInfo {
  if (
    typeof text !== "string" ||
    text.length > 262144 ||
    new TextEncoder().encode(text).byteLength > 262144
  )
    throw Error("FNT描述不能超过256KB");
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length > 1600) throw Error("FNT条目超过预算");
  const rows = lines.map((line) => {
    if (line.length > 4096) throw Error("FNT单行过长");
    const head = /^([a-zA-Z]+)\s+/.exec(line);
    if (!head) throw Error("仅支持BMFont文本格式");
    const rest = line.slice(head[0].length),
      props: Record<string, string> = {};
    let consumed = "";
    const matches = [
      ...rest.matchAll(
        /([A-Za-z][A-Za-z0-9]*)=("[^"\r\n]*"|[-A-Za-z0-9_.,]+)/g,
      ),
    ];
    let cursor = 0;
    for (const m of matches) {
      consumed += rest.slice(cursor, m.index);
      cursor = m.index! + m[0].length;
      if (Object.hasOwn(props, m[1])) throw Error("FNT重复字段");
      props[m[1]] = m[2].startsWith('"') ? m[2].slice(1, -1) : m[2];
    }
    consumed += rest.slice(cursor);
    if (consumed.trim() || !matches.length) throw Error("FNT字段语法不完整");
    if (
      ![
        "info",
        "common",
        "page",
        "chars",
        "char",
        "kernings",
        "kerning",
      ].includes(head[1])
    )
      throw Error("不支持的FNT记录：" + head[1]);
    return { type: head[1], props };
  });
  const one = (type: string) => {
      const a = rows.filter((r) => r.type === type);
      if (a.length !== 1) throw Error("FNT须有且仅有一条" + type);
      return a[0].props;
    },
    info = one("info"),
    common = one("common"),
    page = one("page"),
    chars = one("chars");
  const family = info.face;
  if (!family || family.length > 100 || int(info, "unicode", 1, 1) !== 1)
    throw Error("FNT须为Unicode字体并有有效face");
  const size = int(info, "size", 6, 200),
    lineHeight = int(common, "lineHeight", 1, 256),
    base = int(common, "base", 0, lineHeight),
    width = int(common, "scaleW", 1, 512),
    height = int(common, "scaleH", 1, 2048);
  int(common, "pages", 1, 1);
  int(common, "packed", 0, 0);
  int(page, "id", 0, 0);
  if (!/^[A-Za-z0-9_-]{1,100}\.png$/.test(page.file))
    throw Error("FNT页必须是安全的单个PNG文件名，不允许目录/外部引用");
  const count = int(chars, "count", 1, 512),
    glyphRows = rows.filter((r) => r.type === "char");
  if (glyphRows.length !== count) throw Error("FNT字符计数不匹配");
  const glyphs: Record<number, BitmapGlyph> = {};
  for (const { props: o } of glyphRows) {
    const id = int(o, "id", 32, 65535);
    if ((id >= 0xd800 && id <= 0xdfff) || glyphs[id])
      throw Error("FNT字符重复或不是BMP字符");
    const g = {
      id,
      x: int(o, "x", 0, width),
      y: int(o, "y", 0, height),
      width: int(o, "width", 0, width),
      height: int(o, "height", 0, lineHeight),
      xoffset: int(o, "xoffset", -256, 256),
      yoffset: int(o, "yoffset", 0, lineHeight),
      xadvance: int(o, "xadvance", 0, 512),
      page: int(o, "page", 0, 0),
      chnl: int(o, "chnl", 0, 15),
    };
    if (
      g.x + g.width > width ||
      g.y + g.height > height ||
      g.yoffset + g.height > lineHeight
    )
      throw Error("FNT字形超出图集或行高");
    glyphs[id] = g;
  }
  const kr = rows.filter((r) => r.type === "kerning"),
    kh = rows.filter((r) => r.type === "kernings");
  if (
    kh.length > 1 ||
    (kh.length && int(kh[0].props, "count", 0, 1024) !== kr.length) ||
    (!kh.length && kr.length)
  )
    throw Error("FNT字偶距计数无效");
  const pairs = new Set<string>(),
    kernings = kr.map(({ props: o }) => {
      const first = int(o, "first", 32, 65535),
        second = int(o, "second", 32, 65535),
        amount = int(o, "amount", -128, 128),
        key = first + ":" + second;
      if (
        !glyphs[first] ||
        !glyphs[second] ||
        pairs.has(key) ||
        glyphs[first].xadvance + amount < 0
      )
        throw Error("FNT字偶距引用或偏移无效");
      pairs.add(key);
      return { first, second, amount };
    });
  if (kernings.length > 1024) throw Error("FNT字偶距超过1024项");
  return {
    family,
    size,
    lineHeight,
    base,
    width,
    height,
    page: page.file,
    glyphs,
    kernings,
  };
}
export function bitmapPngBytes(data: string, info: BitmapFontInfo) {
  if (
    typeof data !== "string" ||
    data.length > 1400000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data)
  )
    throw Error("位图字体PNG无效或超过1MB");
  const raw = atob(data.split(",")[1]),
    bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  if (
    bytes.length > 1048576 ||
    bytes.length < 45 ||
    [137, 80, 78, 71, 13, 10, 26, 10].some((n, i) => bytes[i] !== n)
  )
    throw Error("位图字体PNG签名/大小无效");
  const v = new DataView(bytes.buffer);
  let at = 8,
    chunks = 0,
    seenIHDR = false,
    seenIDAT = false,
    seenEnd = false;
  while (at < bytes.length) {
    if (++chunks > 2048 || at + 12 > bytes.length) throw Error("PNG块损坏");
    const n = v.getUint32(at),
      type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (
      n > bytes.length - at - 12 ||
      crc32(bytes.subarray(at + 4, at + 8 + n)) !== v.getUint32(at + 8 + n)
    )
      throw Error("PNG块长度/CRC错误");
    if (type === "IHDR") {
      if (
        seenIHDR ||
        at !== 8 ||
        n !== 13 ||
        v.getUint32(at + 8) !== info.width ||
        v.getUint32(at + 12) !== info.height ||
        bytes[at + 16] !== 8 ||
        bytes[at + 17] !== 0 ||
        bytes[at + 18] !== 0 ||
        bytes[at + 19] !== 0 ||
        bytes[at + 20] !== 0
      )
        throw Error("首版位图字体要求尺寸匹配的8位灰度、非交错PNG");
      seenIHDR = true;
    } else if (type === "IDAT") {
      if (!seenIHDR || seenEnd) throw Error("PNG数据顺序错误");
      seenIDAT = true;
    } else if (type === "IEND") {
      if (n || !seenIDAT || at + n + 12 !== bytes.length)
        throw Error("PNG结束标记错误");
      seenEnd = true;
    } else throw Error("位图字体PNG含不支持的块：" + type);
    at += n + 12;
  }
  if (!seenEnd) throw Error("PNG未完整结束");
  return bytes;
}
export function bitmapFontInfo(f: BitmapFontAsset) {
  const known = cache.get(f.id);
  if (
    known?.descriptor === f.descriptor &&
    known.data === f.atlasData &&
    known.info.family === f.family
  )
    return known.info;
  const info = parseBitmapFont(f.descriptor);
  bitmapPngBytes(f.atlasData, info);
  if (f.family !== info.family || f.id !== identity(f.descriptor, f.atlasData))
    throw Error("位图字体身份与内容不一致");
  cache.set(f.id, { descriptor: f.descriptor, data: f.atlasData, info });
  while (cache.size > 8) cache.delete(cache.keys().next().value!);
  return info;
}
export function validateBitmapFonts(
  p: Pick<Project, "bitmapFonts" | "layers">,
) {
  if (p.bitmapFonts === undefined) return;
  if (!Array.isArray(p.bitmapFonts) || p.bitmapFonts.length > 8)
    throw Error("最多8份项目位图字体");
  let total = 0;
  const ids = new Set<string>();
  for (const f of p.bitmapFonts) {
    if (
      !f ||
      !/^bitmap_[a-f0-9]{32}$/.test(f.id) ||
      ids.has(f.id) ||
      typeof f.family !== "string" ||
      !f.family.trim() ||
      f.family.length > 100 ||
      typeof f.license !== "string" ||
      !f.license.trim() ||
      f.license.length > 100000 ||
      typeof f.source !== "string" ||
      f.source.length > 1000
    )
      throw Error("位图字体身份/许可无效");
    bitmapFontInfo(f);
    const encoded = f.atlasData.split(",")[1];
    total +=
      Math.floor((encoded.length * 3) / 4) -
      (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
    ids.add(f.id);
  }
  if (total > 4194304) throw Error("位图字体图集总量超过4MB");
}
export const bitmapFontResourceId = (id: string) => "GfcBitmap_" + id;
export function bitmapGlyphMissing(info: BitmapFontInfo, text: string) {
  return [...new Set([...text].filter((c) => !info.glyphs[c.codePointAt(0)!]))];
}
export function createBitmapFontAsset(
  descriptor: string,
  atlasData: string,
  license: string,
  source = "用户本地导入",
): BitmapFontAsset {
  const info = parseBitmapFont(descriptor),
    f = {
      id: identity(descriptor, atlasData),
      family: info.family,
      descriptor,
      atlasData,
      license: license.trim(),
      source,
    };
  validateBitmapFonts({ bitmapFonts: [f], layers: [] });
  return f;
}
export async function importBitmapFont(
  files: File[],
  license: string,
): Promise<BitmapFontAsset> {
  if (files.length !== 2 || !license.trim())
    throw Error("请选择一份FNT及匹配PNG，并填写使用授权");
  const fnt = files.find((f) => /\.fnt$/i.test(f.name)),
    png = files.find((f) => /\.png$/i.test(f.name));
  if (!fnt || !png || fnt.size > 262144 || png.size > 1048576)
    throw Error("FNT≤256KB、PNG≤1MB");
  const descriptor = await fnt.text(),
    info = parseBitmapFont(descriptor);
  if (png.name !== info.page) throw Error("PNG名称必须与FNT page.file完全一致");
  let raw = "";
  const bytes = new Uint8Array(await png.arrayBuffer());
  for (let i = 0; i < bytes.length; i += 8192)
    raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const atlasData = "data:image/png;base64," + btoa(raw),
    f = createBitmapFontAsset(
      descriptor,
      atlasData,
      license,
      "用户本地导入：" + fnt.name,
    );
  bitmapFontInfo(f);
  const image = await createImageBitmap(
    new Blob([bytes], { type: "image/png" }),
  );
  if (image.width !== info.width || image.height !== info.height) {
    image.close();
    throw Error("PNG解码尺寸与FNT不符");
  }
  image.close();
  return f;
}
export function bitmapFontDiagnostics(p: Project) {
  p = expandWidgets(p);
  const scale = generationDevice(p).screenWidth / 454,
    out: { layerId: string; message: string }[] = [];
  for (const l of p.layers.filter(
    (l) => l.bitmapFontId && l.exportIncluded !== false,
  )) {
    const f = p.bitmapFonts?.find((f) => f.id === l.bitmapFontId);
    if (!f) {
      out.push({ layerId: l.id, message: "项目缺少位图字体" });
      continue;
    }
    const info = bitmapFontInfo(f);
    if (!["venu445mm", "venu441mm"].includes(generationDevice(p).target)) out.push({layerId:l.id,message:"位图字体原生指标当前仅核验 Venu 4 45mm/41mm"});
    if (
      !["text", "time", "date", "metric"].includes(l.kind) ||
      l.customFont ||
      (l.garminFont !== undefined && l.garminFont !== "auto") ||
      l.widgetOrigin
    )
      out.push({
        layerId: l.id,
        message:
          "固定像素位图字体首版仅支持独立文字/时间/日期/数据，不与其他字体叠用",
      });
    if (
      [l.size, ...(l.aod ? [l.aodSize || l.size] : [])].some(
        (size) => Math.abs(size * scale - info.size) > 0.01,
      )
    )
      out.push({
        layerId: l.id,
        message: `位图字体固定${info.size}px；当前目标字号不匹配，不会任意缩放图集`,
      });
    const missing = bitmapGlyphMissing(info, requiredFontGlyphs(p, l));
    if (missing.length)
      out.push({
        layerId: l.id,
        message: "位图字体缺字：" + missing.join(" "),
      });
  }
  return out;
}
export function usedBitmapFonts(p: Project) {
  p = expandWidgets(p);
  const ids = new Set(
    p.layers
      .filter((l) => l.exportIncluded !== false)
      .map((l) => l.bitmapFontId),
  );
  return (p.bitmapFonts || []).filter((f) => ids.has(f.id));
}
export function bitmapFontFiles(p: Project): CodeFile[] {
  return usedBitmapFonts(p).map((f) => {
    const info = bitmapFontInfo(f),
      id = bitmapFontResourceId(f.id),
      required = new Set(
        [...bitmapRequiredGlyphs(p, f.id)].map((c) => c.codePointAt(0)!),
      ),
      records = Object.values(info.glyphs)
        .filter((g) => required.has(g.id))
        .map(
          (g) =>
            "char " +
            Object.entries({...g,xadvance:Math.max(g.xadvance,g.xoffset+g.width)})
              .map(([k, v]) => k + "=" + v)
              .join(" "),
        );
    return {
      path: `resources/fonts/${id}.fnt`,
      content: `info face=${JSON.stringify(f.family)} size=${info.size} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0\ncommon lineHeight=${info.lineHeight} base=${info.base} scaleW=${info.width} scaleH=${info.height} pages=1 packed=0\npage id=0 file="${id}.png"\nchars count=${records.length}\n${records.join("\n")}\nkernings count=0\n`,
    };
  });
}

export async function preparedBitmapFonts(p: Project) {
  const fonts = usedBitmapFonts(p),
    assets: { path: string; data: string }[] = [],
    reports: {
      id: string;
      font: string;
      targetPixels: number;
      glyphCount: number;
      fontBytes: number;
      atlasWidth: number;
      atlasHeight: number;
      atlasEncodedBytes: number;
      rgbaBytes: number;
    }[] = [];
  for (const f of fonts) {
    const info = bitmapFontInfo(f),
      bytes = bitmapPngBytes(f.atlasData, info),
      image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    image.close();
    const id = bitmapFontResourceId(f.id);
    assets.push({ path: `resources/fonts/${id}.png`, data: f.atlasData });
    reports.push({
      id,
      font: f.family,
      targetPixels: info.size,
      glyphCount: [...bitmapRequiredGlyphs(p, f.id)].length,
      fontBytes: new TextEncoder().encode(f.descriptor).byteLength,
      atlasWidth: info.width,
      atlasHeight: info.height,
      atlasEncodedBytes: bytes.byteLength,
      rgbaBytes: info.width * info.height * 4,
    });
  }
  return { files: bitmapFontFiles(p), assets, reports };
}

export function bitmapRequiredGlyphs(p: Project, id: string) {
  p = expandWidgets(p);
  return [
    ...new Set(
      p.layers
        .filter((l) => l.bitmapFontId === id && l.exportIncluded !== false)
        .flatMap((l) => [...requiredFontGlyphs(p, l)]),
    ),
  ].join("");
}
