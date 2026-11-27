import { exportSources } from "../../src/sourceExport";
import { project, layer } from "../../src/domain";
import {
  createBitmapFontAsset,
  bitmapFontDiagnostics,
} from "../../src/bitmapFonts";
import { bitmapLayerPatch } from "../../src/bitmapFontLayout";
import { chalkAtlas } from "../../src/chalkAtlas";
import { libraryFonts } from "../../src/fontLibrary";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
import { captureWatchface } from "../../src/watchfaceCapture";
Object.assign(window, {
  gfcBitmapHarness: {
    exportSources,
    project,
    layer,
    createBitmapFontAsset,
    bitmapFontDiagnostics,
    bitmapLayerPatch,
    chalkAtlas,
    libraryFonts,
    localGenerate,
    preparedCodeFiles,
    preparedAssets,
    captureWatchface,
  },
});
