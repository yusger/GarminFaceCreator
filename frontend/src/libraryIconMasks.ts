import type { Layer, Project } from "./domain.ts";
import { generationDevice } from "./devices.ts";
import { iconVariants } from "./weatherIcons.ts";
import { fontMaskPng } from "./fontMaskPng.ts";
import { expandWidgets } from "./compound.ts";
export const libraryIconMaskId = (l: Layer) =>
  "GfcLibrary_" + l.id.replace(/[^a-zA-Z0-9]/g, "_");
export function useLibraryIconMask(p: Project, l: Layer) {
  if (!l.libraryIcon?.recolor) return false;
  const d = generationDevice(p);
  return (
    !!l.libraryIcon?.recolor &&
    ["venu445mm", "venu441mm"].includes(d.target) &&
    Math.round((l.w * d.screenWidth) / 454) >= 6 &&
    Math.round((l.h * d.screenHeight) / 454) >= 6 &&
    Math.round((l.w * d.screenWidth) / 454) <= 128 &&
    Math.round((l.h * d.screenHeight) / 454) <= 128
  );
}
export function libraryIconMaskLayers(p: Project) {
  const layers = p.layers.filter(
    (l) => l.exportIncluded !== false && useLibraryIconMask(p, l),
  );
  if (
    layers.length > 96 ||
    layers.some((l) => !/^[-a-zA-Z0-9_]{1,100}$/.test(l.id)) ||
    new Set(layers.map(libraryIconMaskId)).size !== layers.length
  )
    throw Error("Library icon mask identity or budget exceeded");
  const scale = generationDevice(p).screenWidth / 454;
  if (
    layers.reduce(
      (n, l) =>
        n +
        Math.max(1, Math.round(l.w * scale)) *
          Math.max(1, Math.round(l.h * scale)) *
          iconVariants(l).length,
      0,
    ) > 131072
  )
    throw Error("Library icon masks exceed 128Ki target pixel budget");
  return layers;
}
export async function preparedLibraryIconMasks(input: Project) {
  const p = expandWidgets(input),
    layers = libraryIconMaskLayers(p),
    scale = generationDevice(p).screenWidth / 454;
  const files: { path: string; content: string }[] = [],
    assets: { path: string; data: string }[] = [];
  const { rasterIconAtSize } = await import("./iconLibrary.ts");
  for (const l of layers) {
    const w = Math.max(1, Math.round(l.w * scale)),
      h = Math.max(1, Math.round(l.h * scale)),
      variants = iconVariants(l),
      cols = Math.min(variants.length, Math.floor(512 / w)),
      rows = Math.ceil(variants.length / cols),
      id = libraryIconMaskId(l);
    const canvas = document.createElement("canvas");
    canvas.width = cols * w;
    canvas.height = rows * h;
    const ctx = canvas.getContext("2d")!;
    const chars: string[] = [];
    for (const [i, v] of variants.entries()) {
      const data = await rasterIconAtSize(
          {
            ...l,
            color: "#FFFFFF",
            libraryIcon: { ...l.libraryIcon!, id: v.id },
          },
          w,
          h,
        ),
        image = new Image();
      image.src = data;
      await image.decode();
      const x = (i % cols) * w,
        y = Math.floor(i / cols) * h;
      ctx.drawImage(image, x, y, w, h);
      chars.push(
        `char id=${65 + i} x=${x} y=${y} width=${w} height=${h} xoffset=0 yoffset=0 xadvance=${w + 1} page=0 chnl=15`,
      );
    }
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < rgba.length; i += 4)
      rgba[i] = Math.round(rgba[i] * (l.opacity ?? 1));
    assets.push({
      path: `resources/fonts/${id}.png`,
      data: await fontMaskPng(canvas.width, canvas.height, rgba),
    });
    files.push({
      path: `resources/fonts/${id}.fnt`,
      content: `info face="${id}" size=${h} unicode=1\ncommon lineHeight=${h} base=${h} scaleW=${canvas.width} scaleH=${canvas.height} pages=1 packed=0\npage id=0 file="${id}.png"\nchars count=${chars.length}\n${chars.join("\n")}\n`,
    });
  }
  return { files, assets };
}

export function libraryIconPreviewLayer(
  p: Project,
  l: Layer,
  aod: boolean,
): Layer {
  if (!useLibraryIconMask(p, l)) return l;
  const scale = generationDevice(p).screenWidth / 454;
  return {
    ...l,
    x: Math.trunc(l.x * scale) / scale,
    y: Math.trunc(l.y * scale) / scale,
    w: Math.max(1, Math.round(l.w * scale)) / scale,
    h: Math.max(1, Math.round(l.h * scale)) / scale,
    color: aod ? l.aodColor || l.color : l.color,
  };
}
