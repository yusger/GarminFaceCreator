import catalog from "./handImageCatalog.json" with { type: "json" };
import { layer, uid, type Layer } from "./domain";
export const handImageSets = catalog;
export function handImagePatch(
  id: string,
  role: Layer["handType"] = "hour",
): Partial<Layer> {
  const set = handImageSets.find((s) => s.key === id || s.id === id);
  if (!set) throw Error("图片指针不存在");
  return {
    handShape: undefined,
    handBitmap: {
      packId: set.packId,
      setId: set.id,
      role,
      version: set.version,
    },
    image: set.images[role],
    assetId: "hand-image-" + set.packId + "-" + set.id + "-" + role,
    imageFullColor: true,
    handPivotX: 0.5,
    handPivotY: 0.5,
    aodSeconds: "hide",
  };
}
export function createHandImageSet(id: string): Layer[] {
  const set = handImageSets.find((s) => s.key === id || s.id === id);
  if (!set) throw Error("图片指针不存在");
  const groupId = uid();
  return [
    ...(["hour", "minute", "second"] as const).map((role) => ({
      ...layer("hand"),
      ...handImagePatch(id, role),
      handType: role,
      id: uid(),
      name: set.name + { hour: "时针", minute: "分针", second: "秒针" }[role],
      x: 27,
      y: 27,
      w: 400,
      h: 400,
      aod: role !== "second",
      groupId,
      groupName: set.name + "指针套装",
    })),
    {
      ...layer("image"),
      id: uid(),
      name: set.name + "轴帽",
      x: 27,
      y: 27,
      w: 400,
      h: 400,
      image: set.images.cap,
      imageFullColor: true,
      assetId: "hand-image-" + set.packId + "-" + set.id + "-cap",
      aod: false,
      allowClip: true,
      groupId,
      groupName: set.name + "指针套装",
    },
  ];
}
