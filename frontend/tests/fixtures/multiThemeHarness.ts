import { multiThemeFixture, themeDefinition } from "./multiThemeFixture";
import { upgradeThemeDefinition } from "../../src/themeUpgrade";
import { projectForDevice } from "../../src/multiDevice";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
async function fixture() {
  const p = await multiThemeFixture();
  return upgradeThemeDefinition(p, themeDefinition(p)).project;
}
Object.assign(window, {
  gfcMultiTheme: {
    fixture,
    projectForDevice,
    localGenerate,
    preparedCodeFiles,
    preparedAssets,
  },
});
