import type { Layer } from "./domain.ts";
export const deviceFontKeys = [
  "customFont",
  "garminFont",
  "fontWeight",
  "bitmapFontId",
  "bitmapTracking",
  "bitmapTabular",
  "bitmapBaselineShift",
  "bitmapLineHeight",
  "aodSize",
] as const;
export type DeviceFontKey = (typeof deviceFontKeys)[number];
export const fontOverrideKeys = new Set<string>(deviceFontKeys);
// null is the serializable removal marker; the effective Layer always uses undefined.
export function resolvedDeviceOverride(
  patch: Record<string, unknown> | undefined,
): Partial<Layer> {
  return Object.fromEntries(
    Object.entries(patch || {}).map(([key, value]) => [
      key,
      value === null ? undefined : value,
    ]),
  );
}
export const applyDeviceOverride = (
  layer: Layer,
  patch: Record<string, unknown> | undefined,
): Layer => ({ ...layer, ...resolvedDeviceOverride(patch) });
