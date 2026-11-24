import { organizeReferenceLayers } from "./groups";
import { migrateProject } from "./migrations";
import { uid, parseFiles, type Project } from "./domain";

export const CLOWN_REFERENCE_ID = "00000000-0000-4000-8000-000000000001";
export const isReference = (project: Pick<Project, "id">) =>
  [
    CLOWN_REFERENCE_ID,
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
  ].includes(project.id);
let pending: Promise<Project> | undefined;
export function loadClownReference(): Promise<Project> {
  pending ??= fetch("/templates/clownwatch.json", {
    signal: AbortSignal.timeout(15000),
  })
    .then(async (response) => {
      if (!response.ok) throw Error("ClownWatch 参考项目加载失败");
      const reference = migrateProject(await response.json());
      if (
        reference.id !== CLOWN_REFERENCE_ID ||
        reference.name !== "ClownWatch"
      )
        throw Error("参考项目格式不正确");
      parseFiles(JSON.stringify({ files: reference.files }));
      return reference;
    })
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
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
    layers: organizeReferenceLayers(reference.layers),
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
  return Promise.all([
    loadClownReference(),
    ...["skyring", "fine-o-clock"].map(async (name) => {
      const response = await fetch(`/templates/${name}.json`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error(name + " 参考项目加载失败");
      const reference = migrateProject(await response.json());
      if (!isReference(reference)) throw Error("参考项目标识无效");
      parseFiles(JSON.stringify({ files: reference.files }));
      return reference;
    }),
  ]);
}
