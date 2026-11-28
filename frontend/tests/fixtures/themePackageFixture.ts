import { project, layer } from "../../src/domain.ts";
import { fontPatch } from "../../src/fontLibrary.ts";
import {
  enableDevices,
  addDevice,
  selectDevice,
  deviceKey,
} from "../../src/multiDevice.ts";
import { devices } from "../../src/devices.ts";
export function themePackageFixture() {
  let p = project("Theme contract sample", true);
  p.id = "00000000-0000-4000-8000-000000000146";
  p.appId = "14614614614614614614614614614614";
  p.updated = 0;
  p.backgroundColor = "#05090F";
  p.layers = [];
  p.controls = [];
  p.fontRoles = [];
  const themes = [];
  for (const [id, color, font] of [
    ["apex", "#FFBB44", "rajdhani_bold"],
    ["trail", "#55FF99", "sonar_number_font"],
    ["vital", "#66BBFF", "rajdhani_light"],
  ]) {
    const title = {
      ...layer("text"),
      id: id + "-title",
      name: id + " title",
      text: id.toUpperCase(),
      x: 80,
      y: 92,
      w: 294,
      h: 40,
      size: 28,
      color,
      aod: false,
      ...fontPatch("sonar_label_font"),
    };
    const time = {
      ...layer("time"),
      id: id + "-time",
      name: id + " time",
      x: 44,
      y: 160,
      w: 366,
      h: 100,
      size: 72,
      color,
      aod: true,
      aodSize: 54,
      ...fontPatch(font),
    };
    const metric = {
      ...layer("metric"),
      id: id + "-reading",
      name: id + " reading",
      x: 104,
      y: 282,
      w: 246,
      h: 46,
      size: 32,
      color,
      source: "heartRate",
      aod: true,
      aodSize: 26,
      ...fontPatch("sonar_label_font"),
    };
    for (const l of [title, time, metric]) l.aodColor = "#777777";
    p.layers.push(title, time, metric);
    p.controls.push(
      {
        id: id + "-ink",
        label: id + " ink",
        type: "color",
        semantic: "primary",
        default: color,
        targets: [{ layerId: time.id, property: "color" }],
      },
      {
        id: id + "-source",
        label: id + " data",
        type: "dataSource",
        slot: true,
        default: "heartRate",
        options: ["heartRate", "battery"],
        targets: [{ layerId: metric.id, property: "source" }],
      },
    );
    p.fontRoles.push({
      id: id + "-numbers",
      name: id + " numbers",
      themeId: id,
      fontId: font,
      layerIds: [time.id],
    });
    themes.push({
      id,
      name: id.toUpperCase(),
      version: "1.0.0",
      backgroundColor: "#05090F",
      layerIds: [title.id, time.id, metric.id],
      controlIds: [id + "-ink", id + "-source"],
    });
  }
  p.themes = {
    version: 1,
    activeId: "apex",
    defaultId: "apex",
    presets: themes,
  };
  p = addDevice(
    enableDevices(p),
    devices.find((d) => d.id === "venu441mm")!,
  );
  p = selectDevice(
    p,
    deviceKey({ target: "venu445mm", deviceSize: "45mm" }),
    "master",
  );
  p.updated = 0;
  p.revision = 0;
  p.multiDevice!.viewVersion = undefined;
  for (const v of p.multiDevice!.variants) {
    v.revision = 0;
    v.code = { files: [], versions: [], codeRevision: -1 };
  }
  return p;
}
