import { applyLayout, suggestedLayout } from "../../src/layouts";
import { project } from "../../src/domain";
import { captureWatchface } from "../../src/watchfaceCapture";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
export function fixture(id: string, target = "venu445mm") {
  const p = project(id, true);
  p.target = target;
  p.deviceSize = target === "venu445mm" ? "45mm" : "41mm";
  return applyLayout(p, {
    ...suggestedLayout(
      { pixels: target === "venu445mm" ? 454 : 390 },
      "template:" + id,
    ),
    safeInsetPx: 0,
    showGuide: false,
  });
}
export const preview = {
  time: "09:41",
  calendarDate: "2026-11-25",
  utcOffsetMinutes: 480,
  heartRate: 72,
  steps: 8642,
  battery: 78,
  seconds: 15,
};
const api = {
  fixture,
  preview,
  captureWatchface,
  localGenerate,
  preparedCodeFiles,
  preparedAssets,
};
(window as any).gfcVisualKits = api;
