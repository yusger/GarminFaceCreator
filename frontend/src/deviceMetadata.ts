import catalog from "../../resources/devices/sdk-metadata.json" with { type: "json" };
export type DeviceMetadata = {
  target: string;
  status: "sdk-package" | "unknown";
  source?: {
    compilerFile: string;
    simulatorFile: string;
    compilerSha256: string;
    simulatorSha256: string;
    packageVersion: string;
  };
  width?: number;
  height?: number;
  shape?: string | null;
  displayType?: string | null;
  bitsPerPixel?: number | null;
  alphaBlending?: boolean | null;
  apiVersions?: string[];
  watchFaceMemoryBytes?: number | null;
  graphicsPoolBytes?: number | null;
  sensorHistory?: string[];
  vectorFontFaces?: string[];
  aod: string;
  hardwareValidation: string;
};
export const deviceMetadataVersion = catalog.version;
export const deviceMetadataCatalog =
  catalog.devices as unknown as DeviceMetadata[];
export const deviceMetadata = (target: string) =>
  deviceMetadataCatalog.find((d) => d.target === target);
