import type { Project } from "./domain";
export const CURRENT_SCHEMA = 2;
export function migrateProject(value: unknown): Project {
  if (!value || typeof value !== "object") throw Error("项目格式不正确");
  const input = value as Project;
  if (
    !Number.isInteger(input.schemaVersion) ||
    input.schemaVersion < 1 ||
    input.schemaVersion > CURRENT_SCHEMA
  )
    throw Error("不支持的项目版本，请使用兼容版本导入；不会覆盖现有项目。");
  let result = structuredClone(input);
  // Migrations are sequential and keep existing layer IDs/native resource paths intact.
  if (result.schemaVersion === 1) {
    if (!Array.isArray(result.layers)) throw Error("项目图层格式不正确");
    result = {
      ...result,
      schemaVersion: 2,
      layers: result.layers.map((l, i) => ({
        ...l,
        ...(l.image
          ? {
              assetId:
                l.assetId ||
                (/^[a-zA-Z0-9_-]{1,120}$/.test(l.id)
                  ? l.id
                  : `legacy-image-${i}`),
            }
          : {}),
      })),
      assets: result.assets?.map((asset, index) => ({
        ...asset,
        id: asset.id || `legacy-resource-${index}`,
      })),
      designSnapshots: [],
    };
  }
  if (!Array.isArray(result.layers) || !Array.isArray(result.versions))
    throw Error("项目图层或历史格式不正确");
  return result;
}
