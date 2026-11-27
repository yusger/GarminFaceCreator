import {project,layer} from "../../src/domain";
import {chartConfig,previewChart} from "../../src/charts";
import {localGenerate} from "../../src/localGenerator";
import {preparedCodeFiles} from "../../src/chalkFonts";
import {preparedAssets} from "../../src/iconLibrary";
import {captureWatchface} from "../../src/watchfaceCapture";
import {analyzeAodPixels} from "../../src/aodPixels";
Object.assign(window,{gfcChartFixture:{project,layer,chartConfig,previewChart,localGenerate,preparedCodeFiles,preparedAssets,captureWatchface,analyzeAodPixels}});
