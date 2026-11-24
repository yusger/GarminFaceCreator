import type { Layer, Project, CodeFile } from "./domain.ts";
// Official Toybox.Weather.Condition enum values (API 3.2); shared by preview and generated native helper.
export const weatherGroups = [
  {
    key: "clear",
    name: "晴",
    values: [0, 23, 40],
    day: "clear-day",
    night: "clear-night",
  },
  {
    key: "partly",
    name: "多云",
    values: [1, 22, 52],
    day: "partly-cloudy-day",
    night: "partly-cloudy-night",
  },
  {
    key: "cloudy",
    name: "阴",
    values: [2, 20],
    day: "overcast",
    night: "overcast",
  },
  {
    key: "rain",
    name: "雨",
    values: [3, 11, 13, 14, 15, 24, 25, 26, 27, 31, 45, 49],
    day: "rain",
    night: "rain",
  },
  {
    key: "snow",
    name: "雪/冰",
    values: [4, 7, 10, 16, 17, 18, 19, 21, 34, 43, 44, 46, 47, 48, 50, 51],
    day: "snow",
    night: "snow",
  },
  {
    key: "wind",
    name: "风",
    values: [5, 32, 36, 37, 41, 42],
    day: "wind",
    night: "wind",
  },
  {
    key: "thunder",
    name: "雷暴",
    values: [6, 12, 28],
    day: "thunderstorms",
    night: "thunderstorms",
  },
  {
    key: "fog",
    name: "雾/霾",
    values: [8, 9, 29, 30, 33, 35, 38, 39],
    day: "fog",
    night: "fog",
  },
  {
    key: "missing",
    name: "未知/缺失",
    values: [53],
    day: "not-available",
    night: "not-available",
  },
];
export const weatherGroup = (value?: number | null) =>
  weatherGroups.find(
    (g) => value !== null && value !== undefined && g.values.includes(value),
  ) || weatherGroups.at(-1)!;
export const weatherIconId = (l: Layer, key: string) => {
  const group =
    weatherGroups.find((g) => g.key === key) || weatherGroups.at(-1)!;
  return (
    "meteocons_0_1_0_monochrome_" +
    group[l.weatherIcon?.period === "night" ? "night" : "day"].replaceAll(
      "-",
      "_",
    )
  );
};
export function iconVariants(l: Layer) {
  return l.weatherIcon
    ? weatherGroups.map((g) => ({ key: g.key, id: weatherIconId(l, g.key) }))
    : l.libraryIcon
      ? [{ key: "static", id: l.libraryIcon.id }]
      : [];
}
export const iconSymbol = (l: Layer, key = "static") =>
  "GfcIcon_" + l.id.replaceAll("-", "_") + "_" + key;
export function iconResourcePath(l: Layer, key = "static") {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(l.id)) throw Error("素材图层标识无效");
  return `assets/${l.id}${key === "static" ? "" : "_wx_" + key}.png`;
}
export const iconDrawMethod = (l: Layer) => "draw_" + l.id.replaceAll("-", "_");
export function nativeIconBindings(p: Project) {
  return p.layers
    .filter((l) => l.exportIncluded !== false && l.libraryIcon)
    .map((l) => ({
      layerId: l.id,
      call: `GfcIcons.${iconDrawMethod(l)}(dc, scaledX, scaledY)`,
      weather: !!l.weatherIcon,
      assets: iconVariants(l).map((v) => ({
        ...v,
        path: iconResourcePath(l, v.key),
        drawable: iconSymbol(l, v.key),
      })),
    }));
}
export function nativeIconFiles(p: Project): CodeFile[] {
  const layers = p.layers.filter(
    (l) => l.exportIncluded !== false && l.libraryIcon,
  );
  if (!layers.length) return [];
  const drawables = layers
    .flatMap((l) =>
      iconVariants(l).map(
        (v) =>
          `<bitmap id="${iconSymbol(l, v.key)}" filename="../../${iconResourcePath(l, v.key)}"/>`,
      ),
    )
    .join("");
  const methods = layers
    .map((l) => {
      const start = `static function ${iconDrawMethod(l)}(dc as Graphics.Dc,x,y) as Void {`;
      if (!l.weatherIcon)
        return (
          start +
          `dc.drawBitmap(x,y,WatchUi.loadResource(Rez.Drawables.${iconSymbol(l)}));}`
        );
      const branches = weatherGroups
        .filter((g) => g.key !== "missing")
        .map(
          (g) =>
            `if(${g.values.map((v) => `condition==${v}`).join("||")}){resource=Rez.Drawables.${iconSymbol(l, g.key)};}`,
        )
        .join("else ");
      return (
        start +
        `var condition=null;try {var data=Weather.getCurrentConditions();if(data!=null){condition=data.condition;}}catch(e){}var resource=Rez.Drawables.${iconSymbol(l, "missing")};if(condition!=null){${branches}}dc.drawBitmap(x,y,WatchUi.loadResource(resource));}`
      );
    })
    .join("\n");
  return [
    {
      path: "resources/drawables/gfc-icons.xml",
      content: `<drawables>${drawables}</drawables>`,
    },
    {
      path: "source/GfcIcons.mc",
      content: `// GarminFaceCreator fixed icon adapter icons-1. Weather categories are approximate pictograms, not severe-weather warnings.
import Toybox.Graphics;import Toybox.WatchUi;import Toybox.Weather;class GfcIcons {${methods}}`,
    },
  ];
}
export function mergeNativeIcons(p: Project, files: CodeFile[]) {
  const map = new Map(files.map((f) => [f.path, f]));
  for (const f of nativeIconFiles(p)) map.set(f.path, f);
  return [...map.values()];
}
