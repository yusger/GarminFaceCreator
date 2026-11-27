import type { Project } from "./domain";
export type ResourceReference = {
  path: string;
  scope: "current" | "history" | "variant";
  layerId?: string;
  name: string;
};
export type ResourceEntry = {
  id: string;
  kind: "image" | "font";
  name: string;
  data?: string;
  references: ResourceReference[];
  encodedBytes?: number;
};
export type ImageInspection = {
  width?: number;
  height?: number;
  alpha?: boolean;
  rgbaBytes?: number;
  error?: string;
};
export function encodedDataBytes(data: string): number | undefined {
  const match =
    /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(data);
  if (!match) return undefined;
  const payload = match[1].replace(/\s/g, "");
  return (
    Math.floor((payload.length * 3) / 4) -
    (payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0)
  );
}
// Read-only inventory includes history and device variants; no deletion or storage rewriting.
export function resourceInventory(p: Project): ResourceEntry[] {
  const entries = new Map<string, ResourceEntry>();
  function visit(
    value: unknown,
    path: string,
    scope: ResourceReference["scope"],
    owner?: { id: string; name: string },
  ) {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    const nextOwner =
      typeof node.kind === "string" && typeof node.id === "string"
        ? {
            id: owner?.id || node.id,
            name: owner?.name || String(node.name || node.kind),
          }
        : owner;
    for (const [key, child] of Object.entries(node)) {
      const at = `${path}/${key}`;
      if (
        (key === "image" || key === "data") &&
        typeof child === "string" &&
        child.startsWith("data:image/")
      ) {
        let entry = entries.get(child);
        if (!entry) {
          entry = {
            id: `resource-${entries.size + 1}`,
            kind: "image",
            name: String(node.path || nextOwner?.name || "图片"),
            data: child,
            encodedBytes: encodedDataBytes(child),
            references: [],
          };
          entries.set(child, entry);
        }
        entry.references.push({
          path: at,
          scope,
          layerId: scope === "current" ? nextOwner?.id : undefined,
          name: nextOwner?.name || String(node.path || "工程素材"),
        });
      } else if (
        key === "garminFont" &&
        (child === "chalk" || child === "chalkHan") &&
        !node.customFont
      ) {
        const identity = "font:" + child;
        let entry = entries.get(identity);
        if (!entry) {
          entry = {
            id: `resource-${entries.size + 1}`,
            kind: "font",
            name: child === "chalkHan" ? "粉笔中文字体" : "粉笔英文字体",
            references: [],
          };
          entries.set(identity, entry);
        }
        entry.references.push({
          path: at,
          scope,
          layerId: scope === "current" ? nextOwner?.id : undefined,
          name: nextOwner?.name || "字体",
        });
      } else if (key === "customFont" && child && typeof child === "object") {
        const font = child as Record<string, unknown>,
          identity = "font:" + font.file;
        let entry = entries.get(identity);
        if (!entry) {
          entry = {
            id: `resource-${entries.size + 1}`,
            kind: "font",
            name: String(font.family || font.file),
            references: [],
          };
          entries.set(identity, entry);
        }
        entry.references.push({
          path: at,
          scope,
          layerId: scope === "current" ? nextOwner?.id : undefined,
          name: nextOwner?.name || "字体",
        });
      } else if (child && typeof child === "object") {
        const nextScope =
          scope === "history" || key === "versions" || key === "designSnapshots"
            ? "history"
            : scope === "variant" || key === "multiDevice"
              ? "variant"
              : "current";
        visit(child, at, nextScope, nextOwner);
      }
    }
  }
  visit(p, "project", "current");
  return [...entries.values()];
}
export async function inspectLocalImage(
  data: string,
): Promise<ImageInspection> {
  const bytes = encodedDataBytes(data);
  if (bytes === undefined)
    return { error: "仅检查本地PNG/JPEG/WebP的base64素材；没有发起外部请求。" };
  if (bytes > 16 * 1024 * 1024)
    return { error: "编码资源超过16MiB检查预算，未解码。" };
  const image = new Image();
  image.src = data;
  try {
    await image.decode();
    const width = image.naturalWidth,
      height = image.naturalHeight,
      rgbaBytes = width * height * 4;
    if (width * height > 4 * 1024 * 1024)
      return {
        width,
        height,
        rgbaBytes,
        error: "像素超过4Mi检查预算，透明通道未扫描。",
      };
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const dc = canvas.getContext("2d", { willReadFrequently: true });
    if (!dc) throw Error("无法创建像素检查画布");
    dc.drawImage(image, 0, 0);
    const pixels = dc.getImageData(0, 0, width, height).data;
    let alpha = false;
    for (let i = 3; i < pixels.length; i += 4)
      if (pixels[i] !== 255) {
        alpha = true;
        break;
      }
    canvas.width = canvas.height = 0;
    return { width, height, rgbaBytes, alpha };
  } catch {
    return { error: "素材解码失败，像素与透明度未知。" };
  }
}
export const resourceBytes = (n?: number) =>
  n === undefined
    ? "未知"
    : n < 1024
      ? `${n} B`
      : n < 1024 * 1024
        ? `${(n / 1024).toFixed(1)} KiB`
        : `${(n / 1024 / 1024).toFixed(2)} MiB`;
