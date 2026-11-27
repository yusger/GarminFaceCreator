import {contextIdentity} from "./localIdentity.ts";
import type { Project } from "./domain.ts";
import { missingGlyphs } from "./fontLibrary.ts";
const localFontIdentity=(data:string)=>"local_"+contextIdentity(data).replace(/[^a-f0-9]/g, "").padEnd(32, "0").slice(0,32);
export type LocalFont = {
  id: string;
  file: string;
  family: string;
  data: string;
  license: string;
  source: string;
};
const dataPattern = /^data:font\/(ttf|otf);base64,[A-Za-z0-9+/=]+$/;
export function fontDataBytes(data: string) {
  if (!dataPattern.test(data) || data.length > 5600000)
    throw Error("字体数据无效或超过4MB");
  const text = atob(data.split(",")[1]),
    bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  if (bytes.length < 28 || bytes.length > 4 * 1024 * 1024)
    throw Error("字体大小无效");
  const v = new DataView(bytes.buffer),
    signature = v.getUint32(0),
    tables = v.getUint16(4);
  if (
    ![0x00010000, 0x4f54544f].includes(signature) ||
    !tables ||
    tables > 256 ||
    12 + 16 * tables > bytes.length
  )
    throw Error("仅支持有效TTF/OTF字体");
  for (let i = 0; i < tables; i++) {
    const offset = v.getUint32(12 + 16 * i + 8),
      length = v.getUint32(12 + 16 * i + 12);
    if (offset > bytes.length || length > bytes.length - offset)
      throw Error("字体表越界");
  }
  missingGlyphs(bytes.buffer, "");
  return bytes.buffer;
}
export function validateLocalFonts(p: Pick<Project, "localFonts">) {
  if (p.localFonts === undefined) return;
  if (!Array.isArray(p.localFonts) || p.localFonts.length > 8)
    throw Error("项目最多8份本地字体");
  const ids = new Set(),
    files = new Set();
  let total = 0;
  for (const f of p.localFonts) {
    if (
      !f ||
      !/^local_[a-f0-9]{32}$/.test(f.id) ||
      ids.has(f.id) ||
      !/^local_[a-f0-9]{32}\.(ttf|otf)$/.test(f.file) ||
      files.has(f.file) ||
      !f.file.startsWith(f.id + ".") ||
      typeof f.family !== "string" ||
      !f.family.trim() ||
      f.family.length > 100 ||
      typeof f.license !== "string" ||
      !f.license.trim() ||
      f.license.length > 100000 ||
      typeof f.source !== "string" ||
      f.source.length > 1000
    )
      throw Error("本地字体身份或许可信息无效");
    if(f.id!==localFontIdentity(f.data))throw Error("本地字体身份与字节内容不匹配");
    ids.add(f.id);
    files.add(f.file);
    total += fontDataBytes(f.data).byteLength;
  }
  if (total > 16 * 1024 * 1024) throw Error("本地字体总量超过16MB");
}
export async function fontBytes(
  p: Pick<Project, "localFonts">,
  file: string,
): Promise<ArrayBuffer> {
  const local = p.localFonts?.find((f) => f.file === file);
  if (local) return fontDataBytes(local.data);
  if (file.startsWith("local_")) throw Error("项目缺少本地字体：" + file);
  if (!/^[A-Za-z0-9_-]+\.(ttf|otf)$/.test(file)) throw Error("字体路径无效");
  const r = await fetch("/fonts/" + file);
  if (!r.ok) throw Error("字体加载失败：" + file);
  return r.arrayBuffer();
}
export async function importLocalFont(
  file: File,
  license: string,
  source = "用户本地导入",
): Promise<LocalFont> {
  if (
    !/\.(ttf|otf)$/i.test(file.name) ||
    file.size > 4 * 1024 * 1024 ||
    !license.trim()
  )
    throw Error("请选择4MB内TTF/OTF，并提供许可或使用授权说明");
  const bytes = await file.arrayBuffer();
  let raw = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 8192)
    raw += String.fromCharCode(...view.subarray(i, i + 8192));
  const ext = file.name.toLowerCase().endsWith(".otf") ? "otf" : "ttf",
    data = "data:font/" + ext + ";base64," + btoa(raw);
  fontDataBytes(data);
  // Use the existing deterministic identity helper: HTTP LAN origins do not expose crypto.subtle.
  const id=localFontIdentity(data);
  const f = {
    id,
    file: id + "." + ext,
    family: file.name.replace(/\.(ttf|otf)$/i, "").slice(0, 100),
    data,
    license: license.trim(),
    source,
  };
  validateLocalFonts({ localFonts: [f] });
  return f;
}
