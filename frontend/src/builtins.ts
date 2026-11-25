import { referenceAttributions } from "./attribution";
import { organizeReferenceLayers } from "./groups";
import { migrateProject } from "./migrations";
import { uid, parseFiles, type Project } from "./domain";

export const CLOWN_REFERENCE_ID = "00000000-0000-4000-8000-000000000001";
export const isReference = (project: Pick<Project, "id">) =>
  referenceAttributions.some((r) => r.id === project.id);
const pending = new Map<string, Promise<Project>>();
export function loadReferencePackage(
  descriptor: (typeof referenceAttributions)[number],
): Promise<Project> {
  const cached = pending.get(descriptor.id);
  if (cached) return cached;
  const promise = (async () => {
    const response = await fetch(descriptor.bundlePath, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error(descriptor.name + " 参考项目加载失败");
    const bundle = await response.json();
    if (
      bundle.format !== 1 ||
      bundle.project?.id !== descriptor.id ||
      bundle.project?.name !== descriptor.name ||
      !Array.isArray(bundle.images) ||
      !Array.isArray(bundle.binaryAssets)
    )
      throw Error("参考项目格式无效");
    const project = bundle.project;
    const assetData = async (path: string, mime: string) => {
      if (
        !path.startsWith("/default-watchfaces/" + descriptor.template + "/") ||
        path.includes("..") ||
        path.includes("\\")
      )
        throw Error("素材路径无效");
      const response = await fetch(path, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error("素材加载失败");
      const bytes = await response.arrayBuffer();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(new Blob([bytes], { type: mime }));
      });
    };
    for (const asset of bundle.images) {
      const layer = project.layers.find(
        (l: { id: string }) => l.id === asset.layerId,
      );
      if (!layer) throw Error("图片图层不存在");
      layer.image = await assetData(asset.path, asset.mime);
    }
    project.assets = await Promise.all(
      bundle.binaryAssets.map(
        async (a: { id: string; path: string; url: string; mime: string }) => ({
          id: a.id,
          path: a.path,
          data: await assetData(a.url, a.mime),
        }),
      ),
    );
    const reference = migrateProject(project);
    parseFiles(JSON.stringify({ files: reference.files }));
    return reference;
  })().catch((error) => {
    pending.delete(descriptor.id);
    throw error;
  });
  pending.set(descriptor.id, promise);
  return promise;
}
export function loadClownReference(): Promise<Project> {
  return loadReferencePackage(
    referenceAttributions.find((r) => r.id === CLOWN_REFERENCE_ID)!,
  );
}

export function copyReference(
  reference: Project,
  name = reference.name + " 副本",
): Project {
  const appId = uid().replaceAll("-", "");
  return {
    ...structuredClone(reference),
    id: uid(),
    appId,
    referenceId: reference.id,
    codeProvenance: { primary: "reference" },
    layers:
      reference.starterId === "pulsemaniac"
        ? structuredClone(reference.layers)
        : organizeReferenceLayers(reference.layers),
    name,
    updated: Date.now(),
    files: reference.files.map((file) =>
      file.path === "manifest.xml"
        ? { ...file, content: file.content.replaceAll(reference.appId, appId) }
        : { ...file },
    ),
    versions: [],
  };
}

export async function loadReferences(): Promise<Project[]> {
  return Promise.all(referenceAttributions.map(loadReferencePackage));
}
