import type { Layer, Project, BinaryAsset } from "./domain";
export function imageAssetPath(layer: Pick<Layer, "id" | "assetId">) {
  const id = layer.assetId || layer.id;
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) throw Error("图片素材标识无效");
  return `assets/${id}.png`;
}
export function binaryAssets(project: Project): BinaryAsset[] {
  const unique = new Map<string, BinaryAsset>();
  const included = new Set(
    project.layers
      .filter((l) => l.image && l.exportIncluded !== false)
      .map(imageAssetPath),
  );
  const excluded = new Set(
    project.layers
      .filter((l) => l.image && l.exportIncluded === false)
      .map(imageAssetPath),
  );
  const candidates = [
    ...(project.assets || []).filter(
      (asset) => !excluded.has(asset.path) || included.has(asset.path),
    ),
    ...project.layers
      .filter((l) => l.image && l.exportIncluded !== false)
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
