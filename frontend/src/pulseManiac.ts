import { validateProject, type Project } from "./domain";
import { localGenerate, LOCAL_PROVENANCE } from "./localGenerator";
import { addCodeVersion } from "./history";
async function dataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("人物素材读取失败"));
    reader.readAsDataURL(blob);
  });
}
async function hydratePulseManiacReference(): Promise<Project> {
  const response = await fetch("/pulsemaniac/project.json", {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error("PulseManiac 模板暂不可用");
  const bundle = await response.json();
  if (
    bundle.format !== 1 ||
    bundle.project?.starterId !== "pulsemaniac" ||
    !Array.isArray(bundle.images) ||
    bundle.images.length !== 5
  )
    throw Error("PulseManiac 模板格式无效");
  for (const asset of bundle.images) {
    if (
      !/^\/pulsemaniac\/(rest|ready|twist|maniac)\.png$/.test(asset.path) &&
      asset.path !== "/pulsemaniac/background.svg"
    )
      throw Error("人物素材路径无效");
    const r = await fetch(asset.path, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error("人物素材加载失败");
    const blob = await r.blob();
    let image: string;
    if (asset.path.endsWith(".svg")) {
      const uri = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = uri;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 454;
        canvas.height = 454;
        canvas.getContext("2d")!.drawImage(img, 0, 0, 454, 454);
        image = canvas.toDataURL("image/png");
      } finally {
        URL.revokeObjectURL(uri);
      }
    } else
      image = await dataURL(
        new Blob([await blob.arrayBuffer()], { type: "image/png" }),
      );
    const l = bundle.project.layers.find(
      (l: { id: string }) => l.id === asset.layerId,
    );
    if (!l) throw Error("人物图层不存在");
    l.image = image;
  }
  validateProject(bundle.project);
  // Preserve the default reference's fixed identity; copyReference assigns user identities.
  const p = bundle.project as Project;
  if (
    p.id !== "00000000-0000-4000-8000-000000000011" ||
    p.appId !== "1c527eb2365e4be49e09ac95f70747d8"
  )
    throw Error("PulseManiac 默认参考身份无效");
  return addCodeVersion(p, localGenerate(p), LOCAL_PROVENANCE);
}

let pending: Promise<Project> | undefined;
export function loadPulseManiacReference(): Promise<Project> {
  return (pending ??= hydratePulseManiacReference().catch((error) => {
    pending = undefined;
    throw error;
  }));
}
