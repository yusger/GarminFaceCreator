export async function readLocalImage(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw Error("请选择8MB以内的PNG/JPEG/WebP图片");
  const bitmap = await createImageBitmap(file);
  try {
    const c = document.createElement("canvas"),
      scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    c.width = Math.max(1, Math.round(bitmap.width * scale));
    c.height = Math.max(1, Math.round(bitmap.height * scale));
    const dc = c.getContext("2d");
    if (!dc) throw Error("无法读取图片");
    dc.drawImage(bitmap, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}
