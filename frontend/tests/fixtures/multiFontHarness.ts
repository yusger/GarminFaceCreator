import { multiFontFixture } from "./multiFontFixture";
import { projectForDevice } from "../../src/multiDevice";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
Object.assign(window, {
  gfcMultiFonts: {
    multiFontFixture,
    projectForDevice,
    localGenerate,
    preparedCodeFiles,
    preparedAssets,
  },
});
