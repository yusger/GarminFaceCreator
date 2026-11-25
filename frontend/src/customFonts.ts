import type { Layer, Project } from "./domain";
const faces = new Map<string, Promise<FontFace>>();
export const fontFamily = (l: Layer) =>
  l.customFont
    ? "GfcFace_" + l.customFont.id
    : l.garminFont === "chalk"
      ? "GfcChalkLatin"
      : l.garminFont === "chalkHan"
        ? "GfcChalkHan"
        : "Arial, sans-serif";
export async function loadCustomFonts(p: Project) {
  for (const l of p.layers) {
    if (!l.customFont) continue;
    const { id, file } = l.customFont,
      key = id + ":" + file;
    if (!faces.has(key))
      faces.set(
        key,
        (async () => {
          const r = await fetch("/fonts/" + file);
          if (!r.ok) throw Error("字体加载失败");
          const f = await new FontFace(
            "GfcFace_" + id,
            await r.arrayBuffer(),
          ).load();
          document.fonts.add(f);
          return f;
        })().catch((e) => {
          faces.delete(key);
          throw e;
        }),
      );
    await faces.get(key);
  }
}
