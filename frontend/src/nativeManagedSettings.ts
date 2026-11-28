import type { CodeFile, Project } from "./domain";
import { nativeControls } from "./nativeControls";
import { controlSettingKey, sourceCode } from "./nativeSettingIds";
import { controlValue } from "./projectControls";
export const managedSettingPaths = [
  "resources/settings/properties.xml",
  "resources/settings/settings.xml",
  "resources/settings/strings.xml",
];
// The resource contract is managed like fonts; AI still implements drawing and the on-watch menu.
export function mergeNativeSettings(p: Project, files: CodeFile[]): CodeFile[] {
  const managed = nativeControls(p).files.map((f) => ({ ...f }));
  if (!managed.length) return files;
  const props = managed.find((f) => f.path === managedSettingPaths[0])!;
  // A newly installed AI app sees stable defaults, not a migration sentinel it may not implement.
  for (const c of p.controls || [])
    if (c.type === "dataSource") {
      const key = controlSettingKey(c),
        from = '<property id="' + key + '" type="number">-1</property>';
      if (!props.content.includes(from))
        throw Error("Managed source declaration changed");
      props.content = props.content.replace(
        from,
        '<property id="' +
          key +
          '" type="number">' +
          sourceCode(String(controlValue(p, c))) +
          "</property>",
      );
    }
  const ids = (tag: string) =>
      new Set(
        managed.flatMap((f) =>
          [
            ...f.content.matchAll(
              new RegExp(
                "<" + tag + "\\b[^>]*\\sid\\s*=\\s*[\"']([^\"']+)[\"']",
                "g",
              ),
            ),
          ].map((m) => m[1]),
        ),
      ),
    propertyIds = ids("property"),
    stringIds = ids("string");
  const result = files
    .filter((f) => !managedSettingPaths.includes(f.path))
    .map((f) => {
      if (!f.path.startsWith("resources/") || !f.path.endsWith(".xml"))
        return f;
      let content = f.content;
      for (const [tag, set] of [
        ["property", propertyIds],
        ["string", stringIds],
      ] as const) {
        const closed = new RegExp(
            "<" +
              tag +
              "\\b[^>]*\\sid\\s*=\\s*[\"']([^\"']+)[\"'][^>]*(?<!/)>[\\s\\S]*?<\\/" +
              tag +
              "\\s*>",
            "g",
          ),
          single = new RegExp(
            "<" +
              tag +
              "\\b[^>]*\\sid\\s*=\\s*[\"']([^\"']+)[\"'][^>]*\\/\\s*>",
            "g",
          );
        content = content
          .replace(closed, (all, id) => (set.has(id) ? "" : all))
          .replace(single, (all, id) => (set.has(id) ? "" : all));
      }
      content = content.replace(
        /<setting\b[^>]*\bpropertyKey=["']@Properties\.([^"']+)["'][^>]*>[\s\S]*?<\/setting\s*>/g,
        (all, id) => (propertyIds.has(id) ? "" : all),
      );
      return { ...f, content };
    });
  return [...result, ...managed];
}
