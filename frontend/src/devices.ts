import { deviceMetadata, deviceMetadataVersion } from "./deviceMetadata.ts";
export const devices = [
  {
    series: "Venu",
    model: "Venu 4",
    size: "41mm",
    id: "venu441mm",
    pixels: 390,
  },
  {
    series: "Venu",
    model: "Venu 4",
    size: "45mm",
    id: "venu445mm",
    pixels: 454,
  },
  { series: "Venu", model: "Venu 3", size: "45mm", id: "venu3", pixels: 454 },
  { series: "Venu", model: "Venu 3S", size: "41mm", id: "venu3s", pixels: 390 },
  {
    series: "Forerunner",
    model: "Forerunner 570",
    size: "42mm",
    id: "fr57042mm",
    pixels: 390,
  },
  {
    series: "Forerunner",
    model: "Forerunner 570",
    size: "47mm",
    id: "fr57047mm",
    pixels: 454,
  },
  {
    series: "Forerunner",
    model: "Forerunner 970",
    size: "47mm",
    id: "fr970",
    pixels: 454,
  },
  {
    series: "fēnix",
    model: "fēnix 8 AMOLED",
    size: "43mm",
    id: "fenix843mm",
    pixels: 416,
  },
  {
    series: "fēnix",
    model: "fēnix 8 AMOLED",
    size: "47mm",
    id: "fenix847mm",
    pixels: 454,
  },
  {
    series: "fēnix",
    model: "fēnix 8 AMOLED",
    size: "51mm",
    id: "fenix847mm",
    pixels: 454,
  },
];
export const deviceFor = (
  p?: { target?: string; deviceSize?: string } | null,
) =>
  devices.find(
    (d) =>
      d.id === (p?.target || "venu445mm") &&
      (!p?.deviceSize || d.size === p.deviceSize),
  ) || devices[1];
export const deviceLabel = (
  p?: { target?: string; deviceSize?: string } | null,
) => {
  const d = deviceFor(p);
  return d.model + " " + d.size;
};

// Resolve generation metadata strictly: never describe an unknown target as Venu 4.
export function generationDevice(p: { target?: string; deviceSize?: string }) {
  const target = p.target || "venu445mm";
  const device = devices.find(
    (d) => d.id === target && (!p.deviceSize || d.size === p.deviceSize),
  );
  if (!device) throw Error("项目型号或尺寸无效，请选择受支持的目标设备");
  const evidence = deviceMetadata(target);
  if(evidence?.status === "sdk-package" && (evidence.width !== device.pixels || evidence.height !== device.pixels || evidence.shape !== "round" || evidence.displayType !== "amoled")) throw Error("设备目录与SDK元数据不一致，暂停生成并检查目标配置");
  return {
    metadataVersion:deviceMetadataVersion,
    metadata:evidence || {target,status:"unknown",aod:"unverified",hardwareValidation:"unverified"},
    series: device.series,
    model: device.model,
    size: device.size,
    target: device.id,
    screenWidth: device.pixels,
    screenHeight: device.pixels,
    screenShape: "round",
    screenTechnology: "AMOLED",
  };
}
