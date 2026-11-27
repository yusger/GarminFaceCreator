import { project, layer } from "../../src/domain";
import { chalkAtlas } from "../../src/chalkAtlas";
import { fontDataBytes } from "../../src/localFonts";
import { bitmapLayerPatch, bitmapTextLayout } from "../../src/bitmapFontLayout";
import {
  createBitmapFontAsset,
  bitmapFontInfo,
  bitmapFontDiagnostics,
} from "../../src/bitmapFonts";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
import { captureWatchface } from "../../src/watchfaceCapture";
async function fixture(target: string, aod: boolean) {
  if (!["venu445mm", "venu441mm"].includes(target))
    throw Error("Measured bitmap target required");
  const p = project("BitmapTypographyNativeFixture", true);
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  p.backgroundColor = "#101820";
  p.bitmapFonts = [];
  p.layers = [];
  const get = async (path: string) => {
    const r = await fetch(path);
    if (!r.ok) throw Error("Missing licensed font resource " + path);
    return r;
  };
  const ref = await (
      await get("/default-watchfaces/trail/project.json")
    ).json(),
    rajdhani = (ref.project ?? ref).localFonts?.find((f: { family: string }) =>
      f.family.toLowerCase().includes("rajdhani"),
    );
  if (!rajdhani) throw Error("Missing licensed angular reference font");
  const fonts = [
    {
      family: "Barlow Semi Condensed",
      bytes: await (await get("/fonts/sonar-label-font.ttf")).arrayBuffer(),
      license: await (await get("/fonts/sonar-label-font-LICENSE.txt")).text(),
      source: "Licensed library sonar-label-font.ttf",
    },
    {
      family: rajdhani.family,
      bytes: fontDataBytes(rajdhani.data),
      license: rajdhani.license,
      source: rajdhani.source,
    },
    {
      family: "Share Tech Mono",
      bytes: await (await get("/fonts/sonar-number-font.ttf")).arrayBuffer(),
      license: await (await get("/fonts/sonar-number-font-LICENSE.txt")).text(),
      source: "Licensed library sonar-number-font.ttf",
    },
  ];
  for (const [i, font] of fonts.entries()) {
    const atlas = await chalkAtlas(
        font.bytes,
        "Typography" + i,
        28,
        "0123456789:",
        "atlas.png",
      ),
      f = createBitmapFontAsset(
        atlas.content,
        atlas.data,
        font.license,
        font.source,
      );
    p.bitmapFonts.push(f);
    const info = bitmapFontInfo(f);
    for (const [j, text] of ["11:11", "88:88"].entries())
      p.layers.push({
        ...layer("text"),
        ...bitmapLayerPatch(p, f.id),
        id: "font" + i + "-" + j,
        name: font.family,
        text,
        x: 125,
        y: 40 + (i * 2 + j) * 60,
        w: 204,
        h: 60,
        aod: true,
        color: ["#EAF1F6", "#FFC04A", "#38E1D0"][i],
        aodColor: "#667788",
        bitmapTracking: 2,
        bitmapTabular: true,
        bitmapBaselineShift: [-3, 4, 0][i],
        bitmapLineHeight: info.lineHeight + [6, 8, 4][i],
      });
  }
  const issues = bitmapFontDiagnostics(p);
  if (issues.length) throw Error(JSON.stringify(issues));
  p.files = localGenerate(p).map((f) => {
    if (f.path === "source/App.mc")
      return {
        ...f,
        content: f.content
          .replace(
            " function onUpdate(dc as Graphics.Dc) as Void {",
            " function onUpdate(dc as Graphics.Dc) as Void {" +
              (aod ? "sleeping=true;" : ""),
          )
          .replace(
            "if(!gfcFrameReported){System.println(",
            'if(!gfcFrameReported){System.println("GFC_CONTROLLED_BITMAP_TYPOGRAPHY");System.println(',
          )
          .replace(/(local generator basic-[a-z0-9-]+)/, "$1-fixture"),
      };
    if (f.path === "source/GfcBitmapText.mc")
      return {
        ...f,
        content: ("import Toybox.System;\n" + f.content)
          .replace(
            " static var metrics=",
            " static var fixtureSeen={};static var metrics=",
          )
          .replace(
            "prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0){start+=",
            'if(!fixtureSeen.hasKey(id+text)){fixtureSeen[id+text]=true;System.println("GFC_BITMAP_LAYOUT "+id+" "+text+" "+total.format("%d")+" "+start.format("%d")+" "+(top+1).format("%d"));}prev=-1;for(var i=0;i<chars.size();i++){var c=chars[i].toNumber();if(prev>=0){start+=',
          ),
      };
    return f;
  });
  const scale = (target === "venu445mm" ? 454 : 390) / 454,
    metrics = p.layers.map((l) => {
      const f = p.bitmapFonts!.find((f) => f.id === l.bitmapFontId)!,
        layout = bitmapTextLayout(
          bitmapFontInfo(f),
          l.text,
          Math.trunc(l.x * scale),
          Math.trunc(l.y * scale),
          Math.trunc(l.w * scale),
          Math.trunc(l.h * scale),
          l.textAlign,
          l,
        );
      return {
        layerId: l.id,
        fontId: f.id,
        family: l.name,
        text: l.text,
        width: layout.width,
        left: layout.left,
        top: layout.top,
        baseline: layout.baseline,
        y: Math.trunc(l.y * scale),
        h: Math.trunc(l.h * scale),
        tracking: l.bitmapTracking,
        tabular: l.bitmapTabular,
        baselineShift: l.bitmapBaselineShift,
        lineHeight: l.bitmapLineHeight,
      };
    });
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
    metrics,
  };
}
Object.assign(window, {
  gfcBitmapTypography: { fixture, preparedCodeFiles, preparedAssets },
});
