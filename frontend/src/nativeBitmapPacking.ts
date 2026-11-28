import type { Project, CodeFile } from "./domain.ts";
import { generationDevice } from "./devices.ts";
// drawBitmap2 rejects indexed resources. Conservative AI-only preparation for the two verified targets.
export function preparedTransformBitmaps(
  p: Project,
  files: CodeFile[],
): CodeFile[] {
  if (
    p.codeProvenance?.primary !== "ai" ||
    !["venu445mm", "venu441mm"].includes(generationDevice(p).target)
  )
    return files;
  const sources = p.files
    .filter((f) => f.path.endsWith(".mc"))
    .map((f) =>
      f.content.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""),
    )
    .join("\n");
  if (!/\.\s*drawBitmap2\s*\(/.test(sources)) return files;
  return files.map((f) => {
    if (!f.path.startsWith("resources/") || !f.path.endsWith(".xml")) return f;
    const bitmap = /<bitmap\b[^>]*>/g;
    let m;
    while ((m = bitmap.exec(f.content))) {
      if (/\/\s*>$/.test(m[0])) continue;
      const end = f.content.indexOf("</bitmap", bitmap.lastIndex);
      if (end >= 0 && /<palette\b/.test(f.content.slice(bitmap.lastIndex, end)))
        throw Error(
          "drawBitmap2不能使用显式调色板；请改用drawBitmap或调整该资源，平台不会删除自定义palette。",
        );
    }
    const content = f.content.replace(/<bitmap\b[^>]*>/g, (tag) => {
      if (!/\sfilename\s*=/.test(tag)) return tag;
      return tag
        .replace(/\sautomaticPalette\s*=\s*(["'])[^"']*\1/g, "")
        .replace(/\/?>$/, (ending) => ' automaticPalette="false"' + ending);
    });
    return { ...f, content };
  });
}
