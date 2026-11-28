import { prepareThemeFontResources } from "../../src/themeFontPreparation";
import {
  bitmapFontInfo,
  bitmapFontDiagnostics,
  usedBitmapFonts,
} from "../../src/bitmapFonts";
import { projectForDevice, deviceKey } from "../../src/multiDevice";
import { captureWatchface } from "../../src/watchfaceCapture";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
Object.assign(window, {
  gfcThemeFonts: {
    prepareThemeFontResources,
    bitmapFontInfo,
    bitmapFontDiagnostics,
    usedBitmapFonts,
    projectForDevice,
    deviceKey,
    captureWatchface,
    localGenerate,
    preparedCodeFiles,
    preparedAssets,
  },
});
