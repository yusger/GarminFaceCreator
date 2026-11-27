import type { CodeFile } from "./domain";
export type LayerSource = {
  layerId: string;
  partId: string;
  capabilityId: string;
  mode: "active" | "aod";
};
export type SourceRange = LayerSource & {
  path: string;
  start: number;
  end: number;
};
export function mappedDraw(code: string, owner: LayerSource) {
  return code
    ? `\n// GFC_LAYER_BEGIN ${encodeURIComponent(JSON.stringify(owner))}\n${code}\n// GFC_LAYER_END\n`
    : "";
}
export function sourceMapFor(files: CodeFile[]): SourceRange[] {
  const result: SourceRange[] = [];
  for (const file of files) {
    if (
      !file.path.endsWith(".mc") ||
      !file.content.startsWith("// GarminFaceCreator local generator ")
    )
      continue;
    let open: (LayerSource & { start: number }) | undefined;
    const ranges: SourceRange[] = [];
    let invalid = false;
    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const begin = /^\/\/ GFC_LAYER_BEGIN (\S+)$/.exec(lines[i]);
      if (begin) {
        if (open) {
          invalid = true;
          break;
        }
        try {
          const v = JSON.parse(decodeURIComponent(begin[1]));
          if (
            typeof v.layerId !== "string" ||
            typeof v.partId !== "string" ||
            !/^core\.[a-zA-Z]+$/.test(v.capabilityId) ||
            !["active", "aod"].includes(v.mode)
          )
            throw Error("Invalid mapping");
          open = {
            layerId: v.layerId,
            partId: v.partId,
            capabilityId: v.capabilityId,
            mode: v.mode,
            start: i + 2,
          };
        } catch {
          invalid = true;
          break;
        }
      } else if (lines[i] === "// GFC_LAYER_END") {
        if (!open) {
          invalid = true;
          break;
        }
        ranges.push({ ...open, path: file.path, end: i });
        open = undefined;
      }
    }
    if (!invalid && !open) result.push(...ranges);
  }
  return result;
}
export function mappedDiagnostic(
  map: SourceRange[],
  location: { path: string; line: number } | null,
) {
  return location
    ? map.find(
        (r) =>
          r.path === location.path &&
          location.line >= r.start &&
          location.line <= r.end,
      )
    : undefined;
}
