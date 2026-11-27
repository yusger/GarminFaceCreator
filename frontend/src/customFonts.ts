import {fontBytes} from "./localFonts";
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
      key = id + ":" + file + ":" + (p.localFonts?.find(f=>f.id===id)?.data||"");
    if (!faces.has(key))
      faces.set(
        key,
        (async () => {
          const bytes = await fontBytes(p,file);
          const f = await new FontFace(
            "GfcFace_" + id,
            bytes,
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
