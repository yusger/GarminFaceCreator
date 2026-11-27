import { expandWidgets } from "./compound.ts";
import { preparedChalk } from "./chalkFonts";
import { iconVariants, iconResourcePath } from "./weatherIcons";
import type { Layer, Project } from "./domain";
import { binaryAssets, imageAssetPath } from "./assets";
import { generationDevice } from "./devices";
export type LibraryIcon = {
  id: string;
  name: string;
  keywords: string[];
  provider: string;
  style: string;
  path: string;
  source: string;
  upstreamPath: string;
  commit: string;
  package?: string;
  license: string;
  licensePath: string;
  copyright: string;
  sha256: string;
  viewBox: string;
  customStroke: boolean;
};
let pending: Promise<LibraryIcon[]> | undefined;
const svgCache = new Map<string, Promise<string>>();
export function loadIconCatalog(): Promise<LibraryIcon[]> {
  pending ??= fetch("/icon-library/catalog.json")
    .then(async (r) => {
      if (!r.ok) throw Error("素材目录不可用");
      const data = await r.json();
      if (
        data.format !== 1 ||
        !Array.isArray(data.icons) ||
        data.icons.some(
          (i: LibraryIcon) =>
            !/^\/icon-library\/(lucide|meteocons)\/[a-z-]+\.svg$/.test(
              i.path,
            ) || !/^[a-z0-9_]{1,120}$/.test(i.id),
        )
      )
        throw Error("素材目录格式无效");
      return data.icons;
    })
    .catch((e) => {
      pending = undefined;
      throw e;
    });
  return pending;
}
export async function findIcon(id: string) {
  const icon = (await loadIconCatalog()).find((i) => i.id === id);
  if (!icon) throw Error("素材版本不存在：" + id);
  return icon;
}
export async function originalIcon(icon: LibraryIcon) {
  let pending = svgCache.get(icon.id);
  if (!pending) {
    pending = fetch(icon.path)
      .then(async (r) => {
        if (!r.ok) throw Error("素材原始文件不可用");
        return r.text();
      })
      .catch((e) => {
        svgCache.delete(icon.id);
        throw e;
      });
    svgCache.set(icon.id, pending);
  }
  return pending;
}
export async function styledIcon(l: Pick<Layer, "libraryIcon" | "color">) {
  if (!l.libraryIcon) throw Error("缺少素材标识");
  const icon = await findIcon(l.libraryIcon.id),
    raw = await originalIcon(icon);
  if (
    /<!DOCTYPE|<(?:script|animate|animateTransform|animateMotion|foreignObject|image|use|style)\b/i.test(
      raw,
    )
  )
    throw Error("不支持的素材 SVG");
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml"),
    root = doc.documentElement;
  if (root.localName !== "svg" || doc.querySelector("parsererror"))
    throw Error("素材 SVG 无效");
  for (const node of Array.from(root.querySelectorAll("*")))
    for (const attr of Array.from(node.attributes))
      if (
        /^on/i.test(attr.name) ||
        /href/i.test(attr.name) ||
        /url\((?!#)/i.test(attr.value)
      )
        throw Error("素材含外部引用");
  root.setAttribute("color", l.color);
  if (icon.customStroke)
    root.setAttribute("stroke-width", String(l.libraryIcon.strokeWidth));
  if (l.libraryIcon.recolor)
    for (const node of [root, ...Array.from(root.querySelectorAll("*"))])
      for (const attr of ["fill", "stroke", "stop-color"]) {
        const value = node.getAttribute(attr);
        if (value && /^(?:#[0-9a-f]{3,8}|currentColor)$/i.test(value))
          node.setAttribute(attr, l.color);
      }
  return new XMLSerializer().serializeToString(doc);
}
export const svgDataUrl = (svg: string) =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
export async function rasterIcon(
  l: Layer,
  p: Pick<Project, "target" | "deviceSize">,
) {
  const device = generationDevice(p),
    width = Math.max(1, Math.ceil((l.w * device.screenWidth) / 454)),
    height = Math.max(1, Math.ceil((l.h * device.screenHeight) / 454));
  if (width > 2048 || height > 2048)
    throw Error("素材栅格化尺寸最多 2048 像素");
  const doc = new DOMParser().parseFromString(
    await styledIcon(l),
    "image/svg+xml",
  );
  doc.documentElement.setAttribute("width", String(width));
  doc.documentElement.setAttribute("height", String(height));
  const img = new Image();
  img.src = svgDataUrl(new XMLSerializer().serializeToString(doc));
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}
export async function preparedAssets(p: Project) {
  p = expandWidgets(p);
  const assets = new Map(binaryAssets(p).map((a) => [a.path, a]));
  for (const l of p.layers.filter(
    (l) => l.libraryIcon && l.exportIncluded !== false,
  )) {
    if (l.weatherIcon) assets.delete(imageAssetPath(l));
    for (const v of iconVariants(l))
      assets.set(iconResourcePath(l, v.key), {
        path: iconResourcePath(l, v.key),
        data: await rasterIcon(
          { ...l, libraryIcon: { ...l.libraryIcon!, id: v.id } },
          p,
        ),
      });
  }

  for (const a of (await preparedChalk(p)).assets) assets.set(a.path, a);
  return [...assets.values()];
}
