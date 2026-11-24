export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function zipFiles(files: { path: string; data: Uint8Array }[]): Blob {
  const encoder = new TextEncoder(),
    local: Uint8Array[] = [],
    central: Uint8Array[] = [];
  const seen = new Set<string>();
  let offset = 0,
    total = 0;
  for (const file of files) {
    if (
      !file.path ||
      file.path.startsWith("/") ||
      file.path.includes("\\") ||
      file.path.includes(":") ||
      file.path.split("/").some((p) => !p || p === "." || p === "..") ||
      seen.has(file.path.toLowerCase())
    )
      throw Error("无效或重复的导出路径");
    seen.add(file.path.toLowerCase());
    const name = encoder.encode(file.path),
      crc = crc32(file.data),
      header = new Uint8Array(30 + name.length),
      view = new DataView(header.buffer);
    if (name.length > 65535 || file.data.length > 25 * 1024 * 1024)
      throw Error("导出文件超过限制");
    total += file.data.length;
    if (total > 30 * 1024 * 1024 || files.length > 200)
      throw Error("源码包超过 30MB / 200 文件限制");
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(12, 0x5821, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    local.push(header, file.data);
    const record = new Uint8Array(46 + name.length),
      dv = new DataView(record.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0x0800, true);
    dv.setUint16(14, 0x5821, true);
    dv.setUint32(16, crc, true);
    dv.setUint32(20, file.data.length, true);
    dv.setUint32(24, file.data.length, true);
    dv.setUint16(28, name.length, true);
    dv.setUint32(42, offset, true);
    record.set(name, 46);
    central.push(record);
    offset += header.length + file.data.length;
  }
  const length = central.reduce((n, p) => n + p.length, 0),
    end = new Uint8Array(22),
    dv = new DataView(end.buffer);
  dv.setUint32(0, 0x06054b50, true);
  dv.setUint16(8, files.length, true);
  dv.setUint16(10, files.length, true);
  dv.setUint32(12, length, true);
  dv.setUint32(16, offset, true);
  return new Blob(
    [...local, ...central, end].map((part) => new Uint8Array(part).buffer),
    { type: "application/zip" },
  );
}
