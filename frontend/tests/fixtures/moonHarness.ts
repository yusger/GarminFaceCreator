import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MoonIcon from "../../src/MoonIcon";
import { project, layer } from "../../src/domain";
import { moonAt } from "../../src/moon";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
const times = [
  "2026-01-18T19:52:00Z",
  "2026-01-26T04:47:00Z",
  "2026-02-01T22:09:00Z",
  "2026-02-09T12:43:00Z",
];
const referenceTimes = [
  "2026-01-03T10:03:00Z",
  "2026-01-10T15:48:00Z",
  ...times,
  "2026-02-17T12:01:00Z",
  "2026-02-24T12:27:00Z",
  "2026-11-09T07:02:00Z",
  "2026-11-17T11:48:00Z",
  "2026-11-24T14:53:00Z",
  "2026-12-01T06:08:00Z",
];
async function fixture(target: string, aod: boolean) {
  const p = project("MoonDrawingFixture", true);
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  p.backgroundColor = "#101820";
  const pixels = target === "venu445mm" ? 454 : 390;
  p.layers = Array.from({ length: 8 }, (_, i) => ({
    ...layer("moon"),
    id: "moon" + i,
    x: 40 + (i % 4) * 100,
    y: i < 4 ? 120 : 250,
    w: 70,
    h: 70,
    aod: true,
    moonHemisphere: i < 4 ? ("north" as const) : ("south" as const),
  }));
  p.files = localGenerate(p);
  const raw = referenceTimes.map((t) => Date.parse(t) / 1000),
    anchors = times.map((t) => Math.floor(Date.parse(t) / 1000 / 600) * 600);
  p.files = p.files.map((f) => {
    if (f.path === "source/GfcMoon.mc") {
      const original = "var m=read(low);";
      if (f.content.split(original).length !== 2)
        throw Error("Moon draw fixture hook changed");
      return {
        ...f,
        content: f.content
          .replace(
            "static var stamp=-1;",
            "static var fixtureLogged=false;static var stamp=-1;",
          )
          .replace(
            original,
            `var fixtureIndex=Math.floor(x*454.0/dc.getWidth()/100).toNumber();var m=calculate(${JSON.stringify(anchors)}[fixtureIndex]);`,
          ),
      };
    }
    if (f.path === "source/App.mc") {
      const hook = " function onUpdate(dc as Graphics.Dc) as Void {";
      if (f.content.split(hook).length !== 2)
        throw Error("Update fixture hook changed");
      return {
        ...f,
        content: f.content
          .replace(
            hook,
            hook +
              `${aod ? "sleeping=true;" : ""}if(!GfcMoon.fixtureLogged){var stamps=${JSON.stringify(raw)};for(var i=0;i<stamps.size();i++){var sample=GfcMoon.calculate(stamps[i]);System.println("GFC_MOON_CALC "+stamps[i].format("%d")+" "+sample[0].format("%.8f")+" "+sample[1].format("%.8f"));}GfcMoon.fixtureLogged=true;}System.println("GFC_CONTROLLED_MOON_FIXTURE");`,
          )
          .replace(/(local generator basic-[a-z0-9-]+)/, "$1-fixture"),
      };
    }
    return f;
  });
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: pixels,
        height: pixels,
        viewBox: "0 0 454 454",
      },
      createElement(
        "defs",
        {},
        createElement(
          "clipPath",
          { id: "moon-screen" },
          createElement("circle", { cx: 227, cy: 227, r: 227 }),
        ),
      ),
      createElement(
        "g",
        { clipPath: "url(#moon-screen)" },
        createElement("rect", {
          width: 454,
          height: 454,
          fill: aod ? "#000000" : p.backgroundColor,
        }),
        ...p.layers.map((l, i) => {
          const time = times[i % 4],
            preview = {
              calendarDate: time.slice(0, 10),
              time: time.slice(11, 16),
              seconds: 0,
              utcOffsetMinutes: 0,
              heartRate: 80,
              steps: 4500,
              battery: 50,
            };
          return createElement(
            "g",
            { key: l.id, transform: `translate(${l.x},${l.y})` },
            createElement(MoonIcon, { layer: l, preview, aod }),
          );
        }),
      ),
    ),
  );
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
    }),
    canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = pixels;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, pixels, pixels);
  ctx.drawImage(image, 0, 0);
  return {
    p,
    browser: canvas.toDataURL("image/png"),
    references: referenceTimes.map((time, i) => ({
      time,
      seconds: raw[i],
      sample: moonAt(raw[i]),
    })),
    times,
    anchors,
  };
}
Object.assign(window, {
  gfcMoonFixture: { fixture, preparedCodeFiles, preparedAssets },
});
