import { layer, uid, type Project } from "./domain";
export type BackgroundChoice = {
  mode: "auto" | "solid" | "image";
  color: string;
  image?: string;
};
export const defaultBackground: BackgroundChoice = {
  mode: "auto",
  color: "#09121A",
};
export async function readBackground(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw Error("背景只支持8MB以内的PNG/JPEG/WebP");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      image.naturalWidth < 1 ||
      image.naturalHeight < 1 ||
      image.naturalWidth > 8192 ||
      image.naturalHeight > 8192
    )
      throw Error("背景尺寸过大或无效");
    const canvas = document.createElement("canvas");
    canvas.width = 454;
    canvas.height = 454;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("浏览器无法处理图片");
    const scale = Math.max(454 / image.naturalWidth, 454 / image.naturalHeight);
    ctx.drawImage(
      image,
      (454 - image.naturalWidth * scale) / 2,
      (454 - image.naturalHeight * scale) / 2,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function applyBackground(
  p: Project,
  choice?: BackgroundChoice,
): Project {
  if (!choice || choice.mode === "auto") return p;
  if (!/^#[A-Fa-f0-9]{6}$/.test(choice.color)) throw Error("背景颜色无效");
  const result = { ...p, backgroundColor: choice.color };
  if (choice.mode === "image") {
    if (!choice.image?.startsWith("data:image/png;base64,"))
      throw Error("背景图片尚未准备好");
    const bg = {
      ...layer("image"),
      id: uid(),
      assetId: "background-" + uid(),
      name: "背景图片",
      x: 0,
      y: 0,
      w: 454,
      h: 454,
      image: choice.image,
      imageFullColor: true,
      allowClip: true,
      aod: false,
      locked: true,
    };
    const whole = (l: Project["layers"][number]) =>
      ["rect", "circle", "image"].includes(l.kind) &&
      l.x <= 0 &&
      l.y <= 0 &&
      l.w >= 454 &&
      l.h >= 454;
    result.layers = [
      ...p.layers.filter(whole),
      bg,
      ...p.layers.filter((l) => !whole(l)),
    ];
  }
  return result;
}
