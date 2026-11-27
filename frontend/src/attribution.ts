import references from "./referenceAttribution.json" with {type:"json"};
import type { CodeFile } from "./domain";
export const referenceAttributions = references;
export const referenceAttribution = (id?: string) =>
  referenceAttributions.find((r) => r.id === id);
export function observedTemplates(files: CodeFile[]) {
  const result: { outputFile: string; sourceFile: string; version: string }[] =
    [];
  for (const f of files) {
    const local = f.content.match(
        /^\/\/ GarminFaceCreator local generator ([^;\s]+)/,
      ),
      icons = f.content.match(
        /^\/\/ GarminFaceCreator fixed icon adapter ([^.\s]+)/,
      );
    const words = f.content.match(
      /^\/\/ GarminFaceCreator fixed word-time adapter ([^.\s]+)/,
    );
    if (words)
      result.push({
        outputFile: f.path,
        sourceFile: "frontend/src/wordTime.ts",
        version: words[1],
      });
    if (local)
      result.push({
        outputFile: f.path,
        sourceFile: "frontend/src/localGenerator.ts",
        version: local[1],
      });
    if (icons)
      result.push({
        outputFile: f.path,
        sourceFile: "frontend/src/weatherIcons.ts",
        version: icons[1],
      });
  }
  return result;
}
export async function attributionSnapshot() {
  const r = await fetch("/reference-notices/provenance.json");
  if (!r.ok) throw Error("缺少来源快照，请使用完整构建后的页面导出");
  const data = await r.json();
  if (
    data.format !== 1 ||
    !Array.isArray(data.bundles) ||
    !Array.isArray(data.generators)
  )
    throw Error("来源快照格式无效");
  return data;
}
