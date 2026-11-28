import { parseDesign, approvedDesignIcons } from "../../src/aiDesign";
import { localGenerate } from "../../src/localGenerator";
import { captureWatchface } from "../../src/watchfaceCapture";
import { rasterizeProjectFont } from "../../src/rasterizeFont";
import { bitmapLayerPatch } from "../../src/bitmapFontLayout";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
async function fixture(target: string, aod: boolean) {
  if (!["venu445mm", "venu441mm"].includes(target))
    throw Error("Measured target required");
  const c = {
    name: "AiLibraryIconFixture",
    target,
    deviceSize: target === "venu445mm" ? "45mm" : "41mm",
    style: "DIGITAL" as const,
    date: false,
    dateLocale: "en" as const,
    seconds: false,
    sources: [],
    instruction: "Controlled approved library icons",
    complexity: 4 as const,
  };
  const raw = {
    backgroundColor: "#101820",
    layers: [
      {
        id: "clock",
        name: "Fixed time",
        kind: "time",
        timePart: "full",
        fontId: "rajdhani_light",
        x: 100,
        y: 315,
        w: 254,
        h: 60,
        size: 42,
        color: "#EAF1F6",
        aod: true,
        aodColor: "#667788",
      },
      ...approvedDesignIcons.map((icon, i) => ({
        id: "icon-" + i,
        name: icon.name,
        kind: "image",
        iconId: icon.id,
        x: 115 + (i % 3) * 75,
        y: 75 + Math.floor(i / 3) * 55,
        w: 28,
        h: 28,
        size: 20,
        color: ["#38E1D0", "#FFC04A", "#EAF1F6"][i % 3],
        aod: true,
        aodColor: "#667788",
      })),
    ],
  };
  const p = parseDesign(JSON.stringify(raw), c, []);
  p.layers[0] = { ...p.layers[0], kind: "text", text: "09:41" };
  const font = await rasterizeProjectFont(
    p,
    p.layers[0],
    "rajdhani_light",
    Math.round(42 * (target === "venu445mm" ? 1 : 390 / 454)),
  );
  p.bitmapFonts = [font];
  Object.assign(p.layers[0], bitmapLayerPatch(p, font.id));
  p.files = localGenerate(p).map((f) =>
    f.path === "source/App.mc"
      ? {
          ...f,
          content: f.content
            .replace(
              " function onUpdate(dc as Graphics.Dc) as Void {",
              " function onUpdate(dc as Graphics.Dc) as Void {" +
                (aod ? "sleeping=true;" : ""),
            )
            .replace(
              "if(!gfcFrameReported){System.println(",
              'if(!gfcFrameReported){System.println("GFC_CONTROLLED_AI_LIBRARY_ICONS count=' +
                approvedDesignIcons.length +
                '");System.println(',
            )
            .replace(/(local generator basic-[a-z0-9-]+)/, "$1-fixture"),
        }
      : f,
  );
  const shot = await captureWatchface(
    p,
    {
      time: "09:41",
      seconds: 0,
      calendarDate: "2026-11-28",
      heartRate: 80,
      steps: 4500,
      battery: 50,
    },
    aod,
  );
  return {
    p,
    browser: shot.data,
    warnings: shot.warnings,
    aodAnalysis: shot.aodAnalysis,
    iconIds: approvedDesignIcons.map((i) => i.id),
  };
}
Object.assign(window, {
  gfcAiIcons: { fixture, preparedCodeFiles, preparedAssets },
});
