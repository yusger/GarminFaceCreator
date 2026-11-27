import type { CodeFile } from "../src/domain";
export function withFrameMarker(files: CodeFile[]): CodeFile[] {
  return files.map((f) => {
    if (f.path !== "source/App.mc") return f;
    if (!/\n \}\n\}$/.test(f.content))
      throw Error("Probe fixture generator ending changed");
    return {
      ...f,
      content: f.content.replace(
        /\n \}\n\}$/,
        '\n  System.println("GFC_PROBE_FRAME_READY");\n }\n}',
      ),
    };
  });
}
