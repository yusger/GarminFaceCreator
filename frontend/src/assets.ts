import type { Layer, Project, BinaryAsset } from "./domain";
export function imageAssetPath(layer: Layer) {
  const id = layer.assetId || layer.id;
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) throw Error("图片素材标识无效");
  return `assets/${id}.png`;
}
export function binaryAssets(project: Project): BinaryAsset[] {
  const unique = new Map<string, BinaryAsset>();
  const candidates = [
    ...(project.assets || []),
    ...project.layers
      .filter((l) => l.image)
      .map((l) => ({
        id: l.assetId || l.id,
        path: imageAssetPath(l),
        data: l.image!,
      })),
  ];
  for (const asset of candidates) {
    if (unique.has(asset.path) && unique.get(asset.path)!.data !== asset.data)
      throw Error("相同素材路径引用了不同图片：" + asset.path);
    unique.set(asset.path, asset);
  }
  return [...unique.values()];
}
