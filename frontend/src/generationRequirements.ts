import { wordTimeGlyphs } from "./wordTime.ts";
import { metricDisplayUnits, metricDecorations } from "./metricFormat.ts";
import type { Project } from "./domain";
import { generationDevice } from "./devices.ts";

type Adapter = {
  api: string;
  read: string;
  permission?: string;
  unit?: string;
};
const adapters: Record<string, Adapter> = {
  solarScene: {
    api: "3.3.0",
    read: "Position.getInfo().position (passive cache); Weather.getSunrise(location,Time.now()) and getSunset, both nullable; no active GPS, no network",
    permission: "Positioning",
  },
  weatherIcon: {
    api: "3.2.0",
    read: "Weather.getCurrentConditions().condition (nullable cached conditions; use the fixed native icon helper)",
  },
  heartRate: {
    api: "2.1.0",
    read: "SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST}).next().data",
    permission: "SensorHistory",
    unit: "bpm",
  },
  altitude: {
    api: "2.1.0",
    read: "SensorHistory.getElevationHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST}).next().data * 3.280839895 (meters to feet)",
    permission: "SensorHistory",
    unit: "ft",
  },
  steps: { api: "1.0.0", read: "ActivityMonitor.getInfo().steps" },
  calories: {
    api: "1.0.0",
    read: "ActivityMonitor.getInfo().calories (total daily calories, not active-only calories)",
    unit: "kcal",
  },
  distance: {
    api: "1.0.0",
    read: "ActivityMonitor.getInfo().distance / 100000.0 (centimeters to kilometers)",
    unit: "km",
  },
  battery: { api: "1.0.0", read: "System.getSystemStats().battery", unit: "%" },
  seconds: { api: "1.0.0", read: "System.getClockTime().sec" },
  floorsClimbed: {
    api: "2.1.0",
    read: "ActivityMonitor.getInfo().floorsClimbed",
  },
  intensityMinutes: {
    api: "2.1.0",
    read: "ActivityMonitor.getInfo().activeMinutesDay.total",
    unit: "min",
  },
  temperature: {
    api: "3.2.0",
    read: "Weather.getCurrentConditions().temperature",
    unit: "°C",
  },
  humidity: {
    api: "3.2.0",
    read: "Weather.getCurrentConditions().relativeHumidity",
    unit: "%",
  },
  windSpeed: {
    api: "3.2.0",
    read: "Weather.getCurrentConditions().windSpeed",
    unit: "m/s",
  },
  uvIndex: { api: "5.1.0", read: "Weather.getCurrentConditions().uvIndex" },
  stress: {
    api: "4.2.0",
    read: "Complications.getComplication(new Complications.Id(Complications.COMPLICATION_TYPE_STRESS)).value",
    permission: "ComplicationSubscriber",
  },
  recoveryHours: {
    api: "4.2.0",
    read: "Complications.getComplication(new Complications.Id(Complications.COMPLICATION_TYPE_RECOVERY_TIME)).value / 60.0 (minutes to hours)",
    permission: "ComplicationSubscriber",
    unit: "h",
  },
};
const maxApi = (a: string, b: string) => {
  const x = a.split(".").map(Number),
    y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? a : b;
  return a;
};
export function generationRequirements(p: Project) {
  const layers = p.layers.filter((l) => l.exportIncluded !== false);
  const sources = [
    ...new Set(
      layers.flatMap((l) => [
        ...(l.visibility ? [l.visibility.source] : []),
        ...(l.kind === "celestial"
          ? ["solarScene"]
          : l.weatherIcon
            ? ["weatherIcon"]
            : l.kind === "metric" || l.kind === "meter"
              ? [l.source]
              : l.kind === "ring"
                ? [l.ringSource || "seconds"].filter((s) => s !== "static")
                : []),
      ]),
    ),
  ].sort();
  const dataSources = sources.map((source) => {
    const adapter = adapters[source];
    if (!adapter) throw Error("数据源尚无已核查的原生读取规则：" + source);
    return {
      source,
      ...adapter,
      defaultDisplayUnit: metricDisplayUnits[source] || "",
      decoration: metricDecorations[source] || "",
    };
  });
  // The generation contract explicitly uses source-over drawing tools (4.2.1).
  const minApiLevel = dataSources.reduce(
    (version, a) => maxApi(version, a.api),
    "4.2.1",
  );
  const permissions = [
    ...new Set(
      dataSources.flatMap((a) => (a.permission ? [a.permission] : [])),
    ),
  ].sort();
  const drawnText = layers
    .flatMap((l) =>
      l.kind === "date" && l.dateLocale === "zh"
        ? ["周日一二三四五六月"]
        : l.kind === "wordTime"
          ? [wordTimeGlyphs(l.wordLanguage)]
          : l.kind === "text"
            ? [l.text]
            : l.kind === "metric" || l.kind === "meter"
              ? [l.label || "", l.unit || "", l.missingValue || "--"]
              : [],
    )
    .join("");
  // AppName is a native string resource too. Editor layer/group names are not.
  const resourceText =
    p.name +
    drawnText +
    layers
      .filter((l) => l.kind === "metric" && l.metricDecoration !== false)
      .map((l) => metricDecorations[l.source] || "")
      .join("");
  const han = /\p{Script=Han}/u.test(resourceText),
    kana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(resourceText);
  const languages = [
    "eng",
    ...(han ? ["zhs", "zht"] : []),
    ...(kana ? ["jpn"] : []),
  ];
  const glyphs = [
    ...new Set(
      resourceText +
        dataSources.map((a) => a.unit || "").join("") +
        "0123456789:.- /%ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    ),
  ]
    .sort()
    .join("");
  return {
    minApiLevel,
    permissions,
    languages,
    displayUnits: metricDisplayUnits,
    metricDecorations,
    dataSources,
    glyphs,
    languagePolicy:
      "Languages declare available resources, not translations. Han alone cannot identify simplified/traditional Chinese or Japanese; include both Chinese resource locales. Kana adds Japanese. Do not infer face language from editor UI or layer/group names.",
    fontPolicy:
      "Verify every required glyph in the selected target and font, including English-device locale. Use explicitly supplied licensed bitmap fonts when system fonts lack glyphs; never invent support or distribute SDK fonts. Keep ASCII numeric fallbacks. Do not silently replace user text.",
    missingDataPolicy:
      "Guard modules/methods/nullable objects, iterator.next(), values and sentinels before arithmetic. Missing data uses layer.missingValue, never fabricated readings. Nonpositive HR and battery outside 0..100 are unavailable. SensorHistory period=1 means the latest one entry, not the last second. Cached weather needs no Communications permission or external key. Recovery/stress may be unavailable on a given device; guard Complications calls and exceptions.",
  };
}
export function generationManifest(
  p: Project,
  requirements = generationRequirements(p),
) {
  const target = generationDevice(p).target;
  return `<?xml version="1.0" encoding="UTF-8"?><iq:manifest xmlns:iq="http://www.garmin.com/xml/connectiq" version="3"><iq:application id="${p.appId}" type="watchface" name="@Strings.AppName" entry="GeneratedApp" launcherIcon="@Drawables.LauncherIcon" minApiLevel="${requirements.minApiLevel}"><iq:products><iq:product id="${target}"/></iq:products><iq:permissions>${requirements.permissions.map((id) => `<iq:uses-permission id="${id}"/>`).join("")}</iq:permissions><iq:languages>${requirements.languages.map((id) => `<iq:language>${id}</iq:language>`).join("")}</iq:languages><iq:barrels/></iq:application></iq:manifest>`;
}
