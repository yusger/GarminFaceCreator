import {generationDevice} from "./devices";
import type {Project,CodeFile} from "./domain";
export const frameReporterPath="source/GfcFrameReporter.mc";
// Managed instrumentation composes the generated view; it never labels AI output as deterministic.
export function mergeNativeFrameReporter(p:Project,files:CodeFile[]):CodeFile[]{
 const target=generationDevice(p).target;
 const manifest=files.find(f=>f.path==="manifest.xml");if(!manifest)throw Error("原生首帧报告需要manifest.xml");
 if(!/\bentry=["'](?:GeneratedApp|GfcReportedApp)["']/.test(manifest.content))throw Error("AI工程入口须为GeneratedApp，才能安装受管理首帧报告");
 if(!/^[a-z0-9]+$/.test(target))throw Error("首帧报告目标设备无效");
 const code=`// GarminFaceCreator managed AI frame reporter ai-frame-1;
import Toybox.WatchUi;import Toybox.System;
class GfcReportedApp extends GeneratedApp {
 function initialize(){GeneratedApp.initialize();}
 function getInitialView(){var views=GeneratedApp.getInitialView();views[0]=new GfcReportedFace(views[0]);return views;}
}
class GfcReportedFace extends WatchUi.WatchFace {
 var inner=null;var low=false;var reported=false;
 function initialize(view){WatchFace.initialize();inner=view;}
 function onLayout(dc){inner.onLayout(dc);}
 function onShow(){inner.onShow();}
 function onHide(){inner.onHide();}
 function onEnterSleep(){low=true;reported=false;inner.onEnterSleep();}
 function onExitSleep(){low=false;reported=false;inner.onExitSleep();}
 function onUpdate(dc){inner.onUpdate(dc);if(!reported){System.println("GFC_RENDER_READY target=${target} mode="+(low?"aod":"active"));reported=true;}}
 function onPartialUpdate(dc){inner.onPartialUpdate(dc);}
}
`;
 return [...files.filter(f=>f.path!==frameReporterPath).map(f=>f.path==="manifest.xml"?{...f,content:f.content.replace(/\bentry=["'](?:GeneratedApp|GfcReportedApp)["']/,'entry="GfcReportedApp"')}:f),{path:frameReporterPath,content:code}];
}
