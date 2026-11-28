import { fixture as makeProject, preview } from "./visualKitHarness";
import { captureWatchface } from "../../src/watchfaceCapture";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
async function fixture(id: string, target: string, aod: boolean) {
  const p = await makeProject(id, target),
    anchor = "dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);";
  p.files = localGenerate(p).map((f) => {
    if (f.path !== "source/App.mc") return f;
    let content = f.content.replace(
      " function onUpdate(dc as Graphics.Dc) as Void {",
      " function onUpdate(dc as Graphics.Dc) as Void {" +
        (aod ? "sleeping=true;" : ""),
    );
    const fixed = Object.entries({
      heartRate: preview.heartRate,
      steps: preview.steps,
      battery: preview.battery,
    })
      .filter(([key]) => content.includes("var data" + key + "=null;"))
      .map(([key, value]) => "data" + key + "=" + value + ";")
      .join("");
    if (!content.includes(anchor))
      throw Error("Generator fixture anchor changed");
    content = content.replace(
      anchor,
      anchor +
        fixed +
        (content.includes("var dateText=") ? 'dateText="WED 25";' : ""),
    );
    content = content
      .replace(/\bcalendar\.day_of_week\b/g, "(4)")
      .replace(/\bcalendar\.day\b/g, "(25)")
      .replace(/\bcalendar\.month\b/g, "(11)")
      .replace(/\bclock\.hour\b/g, "(9)")
      .replace(/\bclock\.min\b/g, "(41)")
      .replace(/\bclock\.sec\b/g, "(15)");
    content = content
      .replace(
        "if(!gfcFrameReported){System.println(",
        'if(!gfcFrameReported){System.println("GFC_CONTROLLED_VISUAL_KIT ' +
          id +
          '");System.println(',
      )
      .replace(/(local generator basic-[a-z0-9-]+)/, "$1-fixture");
    return { ...f, content };
  });
  const shot = await captureWatchface(p, preview, aod);
  return {
    p,
    browser: shot.data,
    warnings: shot.warnings,
    aodAnalysis: shot.aodAnalysis,
    iconIds: p.layers
      .filter((l) => l.libraryIcon)
      .map((l) => l.libraryIcon!.id),
  };
}
Object.assign(window, {
  gfcVisualKitNative: { fixture, preparedCodeFiles, preparedAssets },
});
