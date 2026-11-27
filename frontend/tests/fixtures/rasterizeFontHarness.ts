import { project, layer } from "../../src/domain";
import { rasterizeProjectFont } from "../../src/rasterizeFont";
import { bitmapFontInfo } from "../../src/bitmapFonts";
import { importLocalFont } from "../../src/localFonts";
Object.assign(window, {
  gfcRaster: {
    project,
    layer,
    rasterizeProjectFont,
    bitmapFontInfo,
    importLocalFont,
  },
});
